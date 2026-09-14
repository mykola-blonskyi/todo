import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  List,
  ListShareStatus,
  ListTemplate,
  ListTemplateStatus,
  TemplateCollaborator,
} from '@prisma/client';
import { isDue } from './recurrence';

type TemplateWithCollaborators = ListTemplate & {
  templateCollaborators: TemplateCollaborator[];
};

@Injectable()
export class OccurrencesService {
  private readonly logger = new Logger(OccurrencesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // GraphQL-facing entry point (owner-authorized) - see spawnForTemplate for
  // the actual Rule 13/14 spawning logic, shared with the cron-driven
  // spawnAllDueOccurrences below.
  async spawnDueOccurrence(ownerId: string, templateId: string, now: Date) {
    const template = await this.prisma.listTemplate.findUnique({
      where: { id: templateId },
      include: { templateCollaborators: true },
    });
    if (!template || template.ownerId !== ownerId) {
      throw new NotFoundException('ListTemplate not found');
    }

    return this.spawnForTemplate(template, now);
  }

  // Cron-facing entry point (TODO-28) - no owner to authorize against, since
  // this runs as the system itself on a schedule, not on behalf of a caller.
  // Only fetches active templates; spawnForTemplate's own status check is
  // still the source of truth for "paused templates spawn nothing" (Rule 18),
  // this is just an optimization to avoid loading paused templates at all.
  async spawnAllDueOccurrences(now: Date) {
    const templates = await this.prisma.listTemplate.findMany({
      where: { status: ListTemplateStatus.active },
      include: { templateCollaborators: true },
    });

    const spawned: List[] = [];
    for (const template of templates) {
      try {
        const list = await this.spawnForTemplate(template, now);
        if (list) {
          spawned.push(list);
        }
      } catch (error) {
        this.logger.error(
          `Spawning Occurrence for ListTemplate ${template.id} failed`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
    return spawned;
  }

  // Rule 13/14: spawns an independent List (with fresh Tasks and accepted
  // ListShares for the template's TemplateCollaborators) if the template is
  // active and its recurrence rule is due at `now`. `now` is an explicit
  // parameter, not read from the system clock here, so both entry points
  // above (and tests) can drive it directly without faking system time.
  private async spawnForTemplate(
    template: TemplateWithCollaborators,
    now: Date,
  ) {
    if (template.status !== ListTemplateStatus.active) {
      return null;
    }

    if (!isDue(template, now)) {
      return null;
    }

    return this.prisma.$transaction(async (tx) => {
      const list = await tx.list.create({
        data: {
          ownerId: template.ownerId,
          title: template.title,
          templateId: template.id,
        },
      });

      if (template.taskTitles.length > 0) {
        await tx.task.createMany({
          data: template.taskTitles.map((title, position) => ({
            listId: list.id,
            title,
            done: false,
            dueDate: null,
            position,
          })),
        });
      }

      if (template.templateCollaborators.length > 0) {
        await tx.listShare.createMany({
          data: template.templateCollaborators.map((collaborator) => ({
            listId: list.id,
            userId: collaborator.userId,
            status: ListShareStatus.accepted,
            respondedAt: now,
          })),
        });
      }

      // Auto-categorizes the spawned List for the template's own owner only
      // - never for TemplateCollaborators, who categorize independently for
      // themselves (business-rules.md Rule 24).
      if (template.defaultCategoryId) {
        await tx.listCategoryAssignment.create({
          data: {
            userId: template.ownerId,
            listId: list.id,
            categoryId: template.defaultCategoryId,
          },
        });
      }

      await tx.listTemplate.update({
        where: { id: template.id },
        data: { lastSpawnedAt: now },
      });

      return list;
    });
  }
}
