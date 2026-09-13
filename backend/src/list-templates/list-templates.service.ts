import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { HubClientService } from '../hub/hub-client.service';
import { ListTemplateRecurrenceType, ListTemplateStatus } from '@prisma/client';
import type { ShareCandidateInput } from '../list-shares/share-candidate.input';
import { validateRecurrence } from './validate-recurrence';

interface ListTemplateInput {
  title: string;
  taskTitles: string[];
  recurrenceType: ListTemplateRecurrenceType;
  weekDays?: number[];
  dayOfMonth?: number | null;
  intervalDays?: number | null;
  streakDays?: number | null;
  streakStartDate?: Date | null;
  timezone: string;
  defaultCategoryId?: string | null;
}

interface ListTemplateUpdate {
  title?: string;
  taskTitles?: string[];
  recurrenceType?: ListTemplateRecurrenceType;
  weekDays?: number[];
  dayOfMonth?: number | null;
  intervalDays?: number | null;
  streakDays?: number | null;
  streakStartDate?: Date | null;
  timezone?: string;
  defaultCategoryId?: string | null;
}

@Injectable()
export class ListTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly hubClientService: HubClientService,
  ) {}

  async searchTemplateCandidates(
    ownerId: string,
    templateId: string,
    q: string,
    sessionCookie: string,
  ) {
    await this.requireOwned(ownerId, templateId);
    return this.hubClientService.searchProjectMembers(q, sessionCookie);
  }

  myListTemplates(ownerId: string) {
    return this.prisma.listTemplate.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async listTemplate(ownerId: string, id: string) {
    return this.requireOwned(ownerId, id);
  }

  async createListTemplate(ownerId: string, input: ListTemplateInput) {
    if (input.defaultCategoryId) {
      await this.requireOwnedCategory(ownerId, input.defaultCategoryId);
    }

    const recurrence = {
      recurrenceType: input.recurrenceType,
      weekDays: input.weekDays ?? [],
      dayOfMonth: input.dayOfMonth ?? null,
      intervalDays: input.intervalDays ?? null,
      streakDays: input.streakDays ?? null,
      timezone: input.timezone,
    };
    validateRecurrence(recurrence);

    return this.prisma.listTemplate.create({
      data: {
        ownerId,
        title: this.requireTitle(input.title),
        taskTitles: input.taskTitles,
        ...recurrence,
        streakStartDate: input.streakStartDate ?? null,
        defaultCategoryId: input.defaultCategoryId ?? null,
      },
    });
  }

  async updateListTemplate(
    ownerId: string,
    id: string,
    updates: ListTemplateUpdate,
  ) {
    const existing = await this.requireOwned(ownerId, id);

    if (updates.defaultCategoryId) {
      await this.requireOwnedCategory(ownerId, updates.defaultCategoryId);
    }

    // Validate the row as it will be, not the patch: switching to `monthly`
    // without sending a dayOfMonth has to fail, and it can only be seen
    // against the existing values.
    validateRecurrence({
      recurrenceType: updates.recurrenceType ?? existing.recurrenceType,
      weekDays: updates.weekDays ?? existing.weekDays,
      dayOfMonth:
        updates.dayOfMonth !== undefined
          ? updates.dayOfMonth
          : existing.dayOfMonth,
      intervalDays:
        updates.intervalDays !== undefined
          ? updates.intervalDays
          : existing.intervalDays,
      streakDays:
        updates.streakDays !== undefined
          ? updates.streakDays
          : existing.streakDays,
      timezone: updates.timezone ?? existing.timezone,
    });

    return this.prisma.listTemplate.update({
      where: { id },
      data: {
        ...(updates.title !== undefined && {
          title: this.requireTitle(updates.title),
        }),
        ...(updates.taskTitles !== undefined && {
          taskTitles: updates.taskTitles,
        }),
        ...(updates.recurrenceType !== undefined && {
          recurrenceType: updates.recurrenceType,
        }),
        ...(updates.weekDays !== undefined && { weekDays: updates.weekDays }),
        ...(updates.dayOfMonth !== undefined && {
          dayOfMonth: updates.dayOfMonth,
        }),
        ...(updates.intervalDays !== undefined && {
          intervalDays: updates.intervalDays,
        }),
        ...(updates.streakDays !== undefined && {
          streakDays: updates.streakDays,
        }),
        ...(updates.streakStartDate !== undefined && {
          streakStartDate: updates.streakStartDate,
        }),
        ...(updates.timezone !== undefined && { timezone: updates.timezone }),
        ...(updates.defaultCategoryId !== undefined && {
          defaultCategoryId: updates.defaultCategoryId,
        }),
      },
    });
  }

  async pauseListTemplate(ownerId: string, id: string) {
    await this.requireOwned(ownerId, id);
    return this.prisma.listTemplate.update({
      where: { id },
      data: { status: ListTemplateStatus.paused },
    });
  }

  async resumeListTemplate(ownerId: string, id: string) {
    await this.requireOwned(ownerId, id);
    return this.prisma.listTemplate.update({
      where: { id },
      data: { status: ListTemplateStatus.active },
    });
  }

  async deleteListTemplate(ownerId: string, id: string) {
    await this.requireOwned(ownerId, id);
    await this.prisma.listTemplate.delete({ where: { id } });
    return true;
  }

  // For the templateCollaboratorsByTemplateId DataLoader
  // (src/graphql/loaders.ts) - one query for every ListTemplate in a
  // fan-out, grouped back into a Map.
  async templateCollaboratorsByTemplateIds(templateIds: string[]) {
    const rows = await this.prisma.templateCollaborator.findMany({
      where: { templateId: { in: templateIds } },
      include: { user: true },
    });

    const byTemplateId = new Map<string, (typeof rows)[number]['user'][]>();
    for (const row of rows) {
      const existing = byTemplateId.get(row.templateId);
      if (existing) {
        existing.push(row.user);
      } else {
        byTemplateId.set(row.templateId, [row.user]);
      }
    }
    return byTemplateId;
  }

  async addTemplateCollaborator(
    ownerId: string,
    templateId: string,
    candidate: ShareCandidateInput,
  ) {
    await this.requireOwned(ownerId, templateId);

    const collaborator = await this.usersService.findOrCreateCandidate({
      hubUserId: candidate.hubUserId,
      email: candidate.email,
      name: candidate.name ?? undefined,
      image: candidate.image ?? undefined,
    });

    // No status to update on a re-add (unlike ListShare's pending/accepted/
    // declined) - a TemplateCollaborator is just membership, so a no-op
    // update makes this idempotent rather than throwing on the unique
    // constraint for an already-added User.
    await this.prisma.templateCollaborator.upsert({
      where: { templateId_userId: { templateId, userId: collaborator.id } },
      create: { templateId, userId: collaborator.id },
      update: {},
    });

    return collaborator;
  }

  async removeTemplateCollaborator(
    ownerId: string,
    templateId: string,
    targetUserId: string,
  ) {
    await this.requireOwned(ownerId, templateId);

    const row = await this.prisma.templateCollaborator.findUnique({
      where: { templateId_userId: { templateId, userId: targetUserId } },
    });
    if (!row) {
      throw new NotFoundException('Template collaborator not found');
    }

    await this.prisma.templateCollaborator.delete({
      where: { templateId_userId: { templateId, userId: targetUserId } },
    });
    return true;
  }

  private requireTitle(title: string): string {
    const trimmed = title.trim();
    if (!trimmed) {
      throw new BadRequestException('ListTemplate title must not be empty');
    }
    return trimmed;
  }

  private async requireOwned(ownerId: string, id: string) {
    const template = await this.prisma.listTemplate.findUnique({
      where: { id },
    });
    if (!template || template.ownerId !== ownerId) {
      throw new NotFoundException('ListTemplate not found');
    }
    return template;
  }

  private async requireOwnedCategory(ownerId: string, id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });
    if (!category || category.ownerId !== ownerId) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }
}
