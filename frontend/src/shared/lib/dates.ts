// Date helpers shared by the layouts and by feature components. Everything
// here is date-only and formatted in UTC: List/Task due dates carry no
// time-of-day (business-rules.md), and pinning the zone keeps server and
// client rendering the same day.

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.UTC(
    Number(fromIso.slice(0, 4)),
    Number(fromIso.slice(5, 7)) - 1,
    Number(fromIso.slice(8, 10)),
  );
  const to = Date.UTC(
    Number(toIso.slice(0, 4)),
    Number(toIso.slice(5, 7)) - 1,
    Number(toIso.slice(8, 10)),
  );
  return Math.round((to - from) / 86_400_000);
}

// "Tue 8 Sep" style, in the UI locale; date-only so no timezone shifting.
export function formatDueDate(
  dueDate: string,
  locale: string,
  options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  },
): string {
  const [y, m, d] = dueDate.slice(0, 10).split('-').map(Number);
  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

// The date a template-spawned List's Occurrence fired (glossary: Occurrence),
// e.g. "Sep 10" in en, "10 вер" in uk - with the year only when it isn't the
// current one, since a
// year on every card is noise. UTC like formatDueDate so server and client
// render the same day.
export function formatOccurrenceDate(
  createdAt: string,
  locale: string,
  today: string = todayIso(),
): string {
  const sameYear = createdAt.slice(0, 4) === today.slice(0, 4);
  return formatDueDate(createdAt, locale, {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

export function formatRelativeDay(iso: string, locale: string): string {
  const then = new Date(iso).getTime();
  const diffMinutes = Math.round((Date.now() - then) / 60_000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (Math.abs(diffMinutes) < 60) return rtf.format(-diffMinutes, 'minute');
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return rtf.format(-diffHours, 'hour');
  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 30) return rtf.format(-diffDays, 'day');
  return rtf.format(-Math.round(diffDays / 30), 'month');
}
