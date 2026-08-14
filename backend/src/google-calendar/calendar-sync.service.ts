import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

  // Pushes a List as a single Calendar event - title + a checklist of every
  // Task (done/not-done marker, position order) in the description
  // (TODO-52/business-rules.md Rule 8). Idempotent-by-update, not
  // idempotent-by-no-op: a second sync call updates the same event (via the
  // stored googleEventId) rather than creating a duplicate, so the
  // checklist always reflects the List's current state.
  async syncListToCalendar(userId: string, listId: string): Promise<boolean> {
    const list = await this.requireAccessToList(userId, listId);
    if (!list.dueDate) {
      throw new BadRequestException(
        'List must have a due date before it can be synced to Google Calendar',
      );
    }

    const tasks = await this.prisma.task.findMany({
      where: { listId },
      orderBy: { position: 'asc' },
    });

    const accessToken =
      await this.googleCalendarService.getValidAccessToken(userId);

    const existing = await this.prisma.calendarSync.findUnique({
      where: { userId_listId: { userId, listId } },
    });

    const { eventId, calendarId } = await this.apiClient.upsertEvent(
      accessToken,
      {
        eventId: existing?.googleEventId,
        summary: list.title,
        description: buildChecklist(tasks),
        dueDate: list.dueDate.toISOString().slice(0, 10),
      },
    );

    await this.prisma.calendarSync.upsert({
      where: { userId_listId: { userId, listId } },
      update: { googleEventId: eventId, googleCalendarId: calendarId },
      create: {
        userId,
        listId,
        googleEventId: eventId,
        googleCalendarId: calendarId,
      },
    });

    return true;
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

function buildChecklist(tasks: { title: string; done: boolean }[]): string {
  return tasks
    .map((task) => `${task.done ? '☑' : '☐'} ${task.title}`)
    .join('\n');
}
