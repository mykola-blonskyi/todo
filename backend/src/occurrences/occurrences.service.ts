import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListShareStatus, ListTemplateStatus } from '@prisma/client';
import { isDue } from './recurrence';

@Injectable()
export class OccurrencesService {
  constructor(private readonly prisma: PrismaService) {}

  // Rule 13/14: spawns an independent List (with fresh Tasks and accepted
  // ListShares for the template's TemplateCollaborators) if the template is
  // active and its recurrence rule is due at `now`. No cron here - `now` is
  // an explicit parameter so this can be driven directly, by tests or by a
  // future scheduler (TODO-28), without faking system time.
  async spawnDueOccurrence(ownerId: string, templateId: string, now: Date) {
    const template = await this.prisma.listTemplate.findUnique({
      where: { id: templateId },
      include: { templateCollaborators: true },
    });
    if (!template || template.ownerId !== ownerId) {
      throw new NotFoundException('ListTemplate not found');
    }

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

      await tx.listTemplate.update({
        where: { id: template.id },
        data: { lastSpawnedAt: now },
      });

      return list;
    });
  }
}
