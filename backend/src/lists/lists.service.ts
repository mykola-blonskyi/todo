import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CalendarSyncService } from '../google-calendar/calendar-sync.service';
import { ListShareStatus } from '@prisma/client';
import { BulkDeleteResult } from '../graphql/bulk-delete-result.model';
import { bulkDelete } from '../graphql/bulk-delete';

const STALE_AFTER_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class ListsService {
  private readonly logger = new Logger(ListsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly calendarSyncService: CalendarSyncService,
  ) {}

  createList(ownerId: string, title: string) {
    return this.prisma.list.create({
      data: { ownerId, title: this.requireTitle(title) },
    });
  }

  myLists(
    userId: string,
    categoryId?: string | null,
    uncategorizedOnly?: boolean | null,
  ) {
    if (categoryId && uncategorizedOnly) {
      throw new BadRequestException(
        'categoryId and uncategorizedOnly are mutually exclusive',
      );
    }

    return this.prisma.list.findMany({
      where: {
        OR: [
          { ownerId: userId },
          {
            shares: {
              some: {
                userId,
                status: ListShareStatus.accepted,
              },
            },
          },
        ],
        ...(categoryId && {
          categoryAssignments: { some: { userId, categoryId } },
        }),
        ...(uncategorizedOnly && {
          categoryAssignments: { none: { userId } },
        }),
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async list(ownerId: string, id: string) {
    return this.requireAccess(ownerId, id);
  }

  async renameList(ownerId: string, id: string, title: string) {
    await this.requireOwned(ownerId, id);
    return this.prisma.list.update({
      where: { id },
      data: { title: this.requireTitle(title) },
    });
  }

  async updateListDueDate(ownerId: string, id: string, dueDate: Date | null) {
    await this.requireOwned(ownerId, id);
    return this.prisma.list.update({
      where: { id },
      data: { dueDate },
    });
  }

  async deleteList(ownerId: string, id: string) {
    await this.requireOwned(ownerId, id);
    // Best-effort Calendar cleanup ahead of the delete (business-rules.md
    // Rule 10) - the CalendarSync rows themselves cascade-delete with the
    // List; this only cleans up the real Google Calendar events first.
    await this.calendarSyncService.deleteCalendarEventsForList(id);
    await this.prisma.list.delete({ where: { id } });
    return true;
  }

  // `unarchivedAt` is what makes a restore permanent, so a List that isn't
  // archived is left alone rather than silently pinned out of the job's reach.
  async unarchiveList(ownerId: string, id: string) {
    const list = await this.requireOwned(ownerId, id);
    if (!list.archivedAt) {
      return list;
    }
    return this.prisma.list.update({
      where: { id },
      data: { archivedAt: null, unarchivedAt: new Date() },
    });
  }

  // business-rules.md Rule 28. Archiving rather than deleting because a
  // delete would trigger Rule 10 and silently remove events from every synced
  // User's own calendar. `now` is a parameter so tests can drive it.
  async archiveStaleTemplateLists(now: Date): Promise<string[]> {
    const candidates = await this.prisma.list.findMany({
      where: {
        templateId: { not: null },
        createdAt: { lte: new Date(now.getTime() - STALE_AFTER_DAYS * DAY_MS) },
        archivedAt: null,
        unarchivedAt: null,
        tasks: { none: { done: false } },
      },
      select: { id: true, templateId: true },
    });
    if (candidates.length === 0) {
      return [];
    }

    // The newest Occurrence stays live, compared against every List of the
    // template regardless of archive state: comparing only against live ones
    // would archive the then-newest on each run until the template had none.
    const templateIds = [
      ...new Set(candidates.map((list) => list.templateId!)),
    ];
    const siblings = await this.prisma.list.findMany({
      where: { templateId: { in: templateIds } },
      select: { id: true, templateId: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    const newestByTemplate = new Map<string, string>();
    for (const sibling of siblings) {
      if (!newestByTemplate.has(sibling.templateId!)) {
        newestByTemplate.set(sibling.templateId!, sibling.id);
      }
    }

    const ids = candidates
      .filter((list) => newestByTemplate.get(list.templateId!) !== list.id)
      .map((list) => list.id);
    if (ids.length === 0) {
      return [];
    }

    await this.prisma.list.updateMany({
      where: { id: { in: ids } },
      data: { archivedAt: now },
    });
    return ids;
  }

  async deleteLists(ownerId: string, ids: string[]): Promise<BulkDeleteResult> {
    return bulkDelete(ids, (id) => this.deleteList(ownerId, id), {
      logger: this.logger,
      entity: 'List',
    });
  }

  // For the listById DataLoader (src/graphql/loaders.ts), used by
  // ListShare.list.
  async listsByIds(ids: string[]) {
    const lists = await this.prisma.list.findMany({
      where: { id: { in: ids } },
    });
    return new Map(lists.map((list) => [list.id, list]));
  }

  // Lives here (not ListSharesService) to avoid a circular module dependency:
  // ListSharesModule already imports ListsModule for ownership checks, so the
  // reverse import isn't available without forwardRef(). ListsService already
  // has direct Prisma access, so no cross-module call is needed anyway.
  //
  // For the acceptedCollaboratorsByListId DataLoader (src/graphql/loaders.ts)
  // - one query for every List in a fan-out, grouped back into a Map.
  async acceptedCollaboratorsByListIds(listIds: string[]) {
    const shares = await this.prisma.listShare.findMany({
      where: { listId: { in: listIds }, status: ListShareStatus.accepted },
      include: { user: true },
    });

    const byListId = new Map<string, (typeof shares)[number]['user'][]>();
    for (const share of shares) {
      const existing = byListId.get(share.listId);
      if (existing) {
        existing.push(share.user);
      } else {
        byListId.set(share.listId, [share.user]);
      }
    }
    return byListId;
  }

  private requireTitle(title: string): string {
    const trimmed = title.trim();
    if (!trimmed) {
      throw new BadRequestException('List title must not be empty');
    }
    return trimmed;
  }

  // A List that isn't the caller's own might as well not exist from their
  // perspective - NotFoundException for both "doesn't exist" and "exists but
  // isn't yours" avoids leaking which lists exist to non-owners.
  async requireOwned(ownerId: string, id: string) {
    const list = await this.prisma.list.findUnique({ where: { id } });
    if (!list || list.ownerId !== ownerId) {
      throw new NotFoundException('List not found');
    }
    return list;
  }

  private async requireAccess(userId: string, id: string) {
    const list = await this.prisma.list.findUnique({ where: { id } });

    if (!list) {
      throw new NotFoundException('List not found');
    }

    if (list.ownerId === userId) {
      return list;
    }

    const listShare = await this.prisma.listShare.findUnique({
      where: {
        listId_userId: {
          userId,
          listId: id,
        },
      },
    });

    if (listShare?.status !== ListShareStatus.accepted) {
      throw new NotFoundException('List not found');
    }

    return list;
  }
}
