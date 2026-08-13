import type { ListTemplate } from './types';

// 2023-01-01 was a Sunday - used as a stable anchor so Intl.DateTimeFormat
// gives us the locale's own short weekday names in the 0=Sunday..6=Saturday
// order the backend expects (Prisma schema comment on ListTemplate.weekDays),
// instead of hand-translating day names into every message catalog.
export function weekdayLabels(locale: string): string[] {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  return Array.from({ length: 7 }, (_, day) =>
    formatter.format(new Date(Date.UTC(2023, 0, 1 + day))),
  );
}

type Translate = (
  key: string,
  values?: Record<string, string | number | Date>,
) => string;

export function recurrenceSummary(
  template: Pick<
    ListTemplate,
    'recurrenceType' | 'weekDays' | 'dayOfMonth' | 'intervalDays' | 'streakDays'
  >,
  locale: string,
  t: Translate,
): string {
  switch (template.recurrenceType) {
    case 'daily':
      return t('recurrenceDaily');
    case 'weekly': {
      const labels = weekdayLabels(locale);
      const days = template.weekDays.map((day) => labels[day]).join(', ');
      return t('recurrenceSummaryWeekly', { days });
    }
    case 'monthly':
      return t('recurrenceSummaryMonthly', { day: template.dayOfMonth ?? 1 });
    case 'everyNDays': {
      const streakDays = template.streakDays ?? 1;
      const restDays = template.intervalDays ?? 0;
      // A 1-day Streak is the plain "every N days" pulse (Rule 25) - N is
      // the full cycle length (the Streak day plus its rest days), not the
      // raw rest-day count alone.
      if (streakDays <= 1) {
        return t('recurrenceSummaryEveryNDays', { interval: 1 + restDays });
      }
      return t('recurrenceSummaryStreak', { on: streakDays, off: restDays });
    }
  }
}
