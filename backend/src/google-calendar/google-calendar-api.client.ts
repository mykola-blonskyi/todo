import { Injectable } from '@nestjs/common';

export interface CreateEventInput {
  summary: string;
  // YYYY-MM-DD - Task.dueDate has no time-of-day semantics (domain-model.md
  // Task fields), so every synced event is created as an all-day event.
  dueDate: string;
}

export interface CreateEventResult {
  eventId: string;
  calendarId: string;
}

// Thin wrapper around the real Google Calendar REST API - injected (not
// instantiated directly) into CalendarSyncService so it can be swapped for a
// mock in tests (ticket acceptance criteria; no automated test calls the
// real API).
@Injectable()
export class GoogleCalendarApiClient {
  async createEvent(
    accessToken: string,
    event: CreateEventInput,
  ): Promise<CreateEventResult> {
    const calendarId = 'primary';
    const end = nextDay(event.dueDate);

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: event.summary,
          // All-day event - Google Calendar's end.date is exclusive, so a
          // single-day event spans [dueDate, dueDate + 1).
          start: { date: event.dueDate },
          end: { date: end },
        }),
      },
    );

    if (!res.ok) {
      throw new Error(`Google Calendar event creation failed: ${res.status}`);
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
