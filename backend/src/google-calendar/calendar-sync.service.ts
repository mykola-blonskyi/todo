import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListShareStatus } from '@prisma/client';
import { GoogleCalendarService } from './google-calendar.service';
import { GoogleCalendarApiClient } from './google-calendar-api.client';

@Injectable()
export class CalendarSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly apiClient: GoogleCalendarApiClient,
  ) {}

  // Pushes every Task with a dueDate that this user hasn't already synced -
  // idempotent by construction (business-rules.md Rule 8, ADR-005): a
  // CalendarSync row is the source of truth for "already synced", checked
  // before calling the API at all, and its (userId, taskId) uniqueness is
  // still enforced at the DB level as a backstop. Returns the count of
  // newly-synced Tasks.
  async syncListToCalendar(userId: string, listId: string): Promise<number> {
    await this.requireAccessToList(userId, listId);

    const tasks = await this.prisma.task.findMany({
      where: { listId, dueDate: { not: null } },
    });
    if (tasks.length === 0) {
      return 0;
    }

    const existingSyncs = await this.prisma.calendarSync.findMany({
      where: { userId, taskId: { in: tasks.map((task) => task.id) } },
    });
    const alreadySynced = new Set(existingSyncs.map((sync) => sync.taskId));
    const toSync = tasks.filter((task) => !alreadySynced.has(task.id));
    if (toSync.length === 0) {
      return 0;
    }

    const accessToken =
      await this.googleCalendarService.getValidAccessToken(userId);

    for (const task of toSync) {
      const { eventId, calendarId } = await this.apiClient.createEvent(
        accessToken,
        {
          summary: task.title,
          dueDate: task.dueDate!.toISOString().slice(0, 10),
        },
      );
      await this.prisma.calendarSync.create({
        data: {
          userId,
          taskId: task.id,
          googleEventId: eventId,
          googleCalendarId: calendarId,
        },
      });
    }

    return toSync.length;
  }

  // Same owner-or-accepted-collaborator check duplicated across services -
  // see CommentsService's identical private helper for why (avoids a
  // circular module dependency).
  private async requireAccessToList(userId: string, id: string) {
    const list = await this.prisma.list.findUnique({ where: { id } });
    if (!list) {
      throw new NotFoundException('List not found');
    }
    if (list.ownerId === userId) {
      return list;
    }

    const listShare = await this.prisma.listShare.findUnique({
      where: { listId_userId: { userId, listId: id } },
    });

    if (listShare?.status !== ListShareStatus.accepted) {
      throw new NotFoundException('List not found');
    }
    return list;
  }
}
