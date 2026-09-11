import { Injectable } from '@nestjs/common';
import { GoogleGrantRevokedError } from './google-calendar.errors';

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
      await throwIfRevoked(res);
      throw new Error(
        `Google Calendar event upsert failed: ${res.status} ${await errorReason(res)}`,
      );
    }

    const data = (await res.json()) as { id: string };
    return { eventId: data.id, calendarId };
  }

  async deleteEvent(accessToken: string, eventId: string): Promise<void> {
    const calendarId = 'primary';
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    // 410 Gone means Google already considers the event deleted - treat as
    // success, not an error, so a retry of an already-cleaned-up event
    // doesn't get logged as a failure.
    if (!res.ok && res.status !== 410) {
      await throwIfRevoked(res);
      throw new Error(
        `Google Calendar event deletion failed: ${res.status} ${await errorReason(res)}`,
      );
    }
  }
}

// A 401 here means the access token we just presented isn't accepted any
// more. Since getValidAccessToken refreshes anything within EXPIRY_SKEW_MS of
// expiring, the realistic cause is a revoked grant rather than a token that
// merely aged out mid-flight - so callers get the same signal a failed
// refresh gives them (Rule 29).
async function throwIfRevoked(res: Response): Promise<void> {
  if (res.status === 401) {
    throw new GoogleGrantRevokedError(`401 ${await errorReason(res)}`.trim());
  }
}

// Google's error body carries the actual reason (e.g. "insufficientPermissions",
// "accessNotConfigured" when the Calendar API isn't enabled on the project,
// "rateLimitExceeded") that a bare status code hides - critical for a 403,
// which Google returns for several unrelated causes. Best-effort: falls back
// to nothing if the body isn't the expected JSON shape (or isn't JSON at all).
async function errorReason(res: Response): Promise<string> {
  try {
    const body = (await res.clone().json()) as {
      error?: { message?: string; errors?: { reason?: string }[] };
    };
    const reason = body.error?.errors?.[0]?.reason;
    const message = body.error?.message;
    return [reason, message].filter(Boolean).join(': ');
  } catch {
    try {
      return await res.clone().text();
    } catch {
      return '';
    }
  }
}

function nextDay(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}
