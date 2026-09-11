import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListShareStatus } from '@prisma/client';
import { GoogleCalendarService } from './google-calendar.service';
import { GoogleCalendarApiClient } from './google-calendar-api.client';
import { GoogleGrantRevokedError } from './google-calendar.errors';

@Injectable()
export class CalendarSyncService {
  private readonly logger = new Logger(CalendarSyncService.name);

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

    let eventId: string;
    let calendarId: string;
    try {
      ({ eventId, calendarId } = await this.apiClient.upsertEvent(accessToken, {
        eventId: existing?.googleEventId,
        summary: list.title,
        description: buildChecklist(tasks),
        dueDate: list.dueDate.toISOString().slice(0, 10),
      }));
    } catch (error) {
      await this.flagIfRevoked(userId, error);
      if (error instanceof GoogleGrantRevokedError) {
        throw new BadRequestException(
          'Google Calendar access was revoked - reconnect to sync again',
        );
      }
      throw error;
    }

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

  // Best-effort delete of every synced Calendar event for this List, one per
  // user who'd synced it (business-rules.md Rule 10). Never throws - a
  // failed Google API call is logged, not treated as a failure of the List
  // deletion this runs ahead of. The CalendarSync rows themselves aren't
  // deleted here; that's Prisma's cascade once the List row is gone.
  async deleteCalendarEventsForList(listId: string): Promise<void> {
    const syncs = await this.prisma.calendarSync.findMany({
      where: { listId },
    });

    for (const sync of syncs) {
      try {
        const accessToken =
          await this.googleCalendarService.getValidAccessToken(sync.userId);
        await this.apiClient.deleteEvent(accessToken, sync.googleEventId);
      } catch (error) {
        await this.flagIfRevoked(sync.userId, error);
        this.logger.error(
          `Failed to delete synced Calendar event for list ${listId}, user ${sync.userId}`,
          error instanceof Error ? error.stack : error,
        );
      }
    }
  }

  // Best-effort delete of one user's synced Calendar event for this List -
  // used when that user loses access (removed by the owner, or leaves
  // voluntarily), not when the whole List is deleted (business-rules.md
  // Rule 10). Other users' CalendarSync rows/events for the same List are
  // untouched. The row is removed locally regardless of whether the Google
  // API call itself succeeds - matches the "removed regardless" wording the
  // now-retired Rule 9 originally established for this same trade-off.
  async deleteCalendarEventForUser(
    userId: string,
    listId: string,
  ): Promise<void> {
    const sync = await this.prisma.calendarSync.findUnique({
      where: { userId_listId: { userId, listId } },
    });
    if (!sync) {
      return;
    }

    try {
      const accessToken =
        await this.googleCalendarService.getValidAccessToken(userId);
      await this.apiClient.deleteEvent(accessToken, sync.googleEventId);
    } catch (error) {
      await this.flagIfRevoked(userId, error);
      this.logger.error(
        `Failed to delete synced Calendar event for list ${listId}, user ${userId}`,
        error instanceof Error ? error.stack : error,
      );
    }

    await this.prisma.calendarSync.delete({
      where: { userId_listId: { userId, listId } },
    });
  }

  // Whichever call first notices the grant is gone flags the connection, so
  // Settings stops claiming "Connected" (Rule 29) - including from the
  // best-effort cleanup paths, which swallow the error itself but shouldn't
  // swallow what it told us.
  private async flagIfRevoked(userId: string, error: unknown): Promise<void> {
    if (error instanceof GoogleGrantRevokedError) {
      await this.googleCalendarService.markRevoked(userId);
    }
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
