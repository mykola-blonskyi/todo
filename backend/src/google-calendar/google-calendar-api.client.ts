import { Injectable } from '@nestjs/common';

export interface UpsertEventInput {
  // When set, the existing event is updated (PATCH) rather than created -
  // sync is idempotent-by-update, not idempotent-by-no-op (TODO-52).
  eventId?: string;
  summary: string;
  description: string;
  // YYYY-MM-DD - List.dueDate has no time-of-day semantics (domain-model.md
  // List fields), so the synced event is always all-day.
  dueDate: string;
}

export interface UpsertEventResult {
  eventId: string;
  calendarId: string;
}

// Thin wrapper around the real Google Calendar REST API - injected (not
// instantiated directly) into CalendarSyncService so it can be swapped for a
// mock in tests (ticket acceptance criteria; no automated test calls the
// real API).
@Injectable()
export class GoogleCalendarApiClient {
  async upsertEvent(
    accessToken: string,
    event: UpsertEventInput,
  ): Promise<UpsertEventResult> {
    const calendarId = 'primary';
    const end = nextDay(event.dueDate);

    const url = event.eventId
      ? `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${event.eventId}`
      : `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`;

    const res = await fetch(url, {
      method: event.eventId ? 'PATCH' : 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: event.summary,
        description: event.description,
        // All-day event - Google Calendar's end.date is exclusive, so a
        // single-day event spans [dueDate, dueDate + 1).
        start: { date: event.dueDate },
        end: { date: end },
      }),
    });

    if (!res.ok) {
      throw new Error(`Google Calendar event upsert failed: ${res.status}`);
    }

    const data = (await res.json()) as { id: string };
    return { eventId: data.id, calendarId };
  }
}

function nextDay(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}
