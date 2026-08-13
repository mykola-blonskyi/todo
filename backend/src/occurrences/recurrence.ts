import { ListTemplateRecurrenceType } from '@prisma/client';

interface RecurrenceTemplate {
  recurrenceType: ListTemplateRecurrenceType;
  weekDays: number[];
  dayOfMonth: number | null;
  intervalDays: number | null;
  streakDays: number | null;
  streakStartDate: Date | null;
  timezone: string;
  lastSpawnedAt: Date | null;
  createdAt: Date;
}

interface YMD {
  year: number;
  month: number;
  day: number;
}

// A calendar date's weekday/days-in-month/days-between are timezone-
// independent once the year/month/day are known - only zonedYMD itself needs
// the template's timezone, everything downstream operates on plain Y-M-D.
function zonedYMD(date: Date, timeZone: string): YMD {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
  };
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function weekdayOf(ymd: YMD): number {
  return new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day)).getUTCDay();
}

function daysBetween(a: YMD, b: YMD): number {
  const utcA = Date.UTC(a.year, a.month - 1, a.day);
  const utcB = Date.UTC(b.year, b.month - 1, b.day);
  return Math.round((utcB - utcA) / 86_400_000);
}

function sameDay(a: YMD, b: YMD): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

// Given a ListTemplate's recurrence config and an explicit `now`, decides
// whether an Occurrence is due - Rule 15 (evaluated in the template's own
// timezone) and Rule 16 (monthly dayOfMonth clamped to the month's last day).
// Never spawns twice on the same calendar day, regardless of recurrenceType.
export function isDue(template: RecurrenceTemplate, now: Date): boolean {
  const today = zonedYMD(now, template.timezone);
  const lastSpawned = template.lastSpawnedAt
    ? zonedYMD(template.lastSpawnedAt, template.timezone)
    : null;

  if (lastSpawned && sameDay(lastSpawned, today)) {
    return false;
  }

  switch (template.recurrenceType) {
    case ListTemplateRecurrenceType.daily:
      return true;
    case ListTemplateRecurrenceType.weekly:
      return template.weekDays.includes(weekdayOf(today));
    case ListTemplateRecurrenceType.monthly: {
      const clampedDay = Math.min(
        template.dayOfMonth ?? 1,
        daysInMonth(today.year, today.month),
      );
      return today.day === clampedDay;
    }
    case ListTemplateRecurrenceType.everyNDays: {
      // Rule 25 (business-rules.md): fires for `streakDays` consecutive days,
      // then rests for `intervalDays` days, repeating from `streakStartDate`
      // - pure calendar arithmetic, deliberately independent of
      // `lastSpawnedAt` (that's only used above for the same-day guard).
      const streakLength = template.streakDays ?? 1;
      const restLength = template.intervalDays ?? 0;
      const cycleLength = streakLength + restLength;
      const anchor = zonedYMD(
        template.streakStartDate ?? template.createdAt,
        template.timezone,
      );
      const daysSinceAnchor = daysBetween(anchor, today);
      if (daysSinceAnchor < 0) {
        return false;
      }
      return daysSinceAnchor % cycleLength < streakLength;
    }
  }
}
