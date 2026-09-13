import { BadRequestException } from '@nestjs/common';
import { ListTemplateRecurrenceType } from '@prisma/client';

export interface RecurrenceConfig {
  recurrenceType: ListTemplateRecurrenceType;
  weekDays: number[];
  dayOfMonth: number | null;
  intervalDays: number | null;
  streakDays: number | null;
  timezone: string;
}

function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

function requireInteger(
  value: number | null,
  field: string,
  min: number,
  max: number,
): number {
  if (value == null || !Number.isInteger(value) || value < min || value > max) {
    throw new BadRequestException(
      `${field} must be an integer between ${min} and ${max}`,
    );
  }
  return value;
}

// The recurrence fields a ListTemplate needs depend entirely on its
// recurrenceType, so this is where that dependency is stated once. Everything
// downstream (recurrence.ts isDue) then trusts the row.
//
// Nothing validated these before, and every invalid value failed silently
// rather than loudly: an unknown timezone threw inside Intl and aborted the
// whole cron run for every template after it, intervalDays of -1 made the
// cycle length 0 and `n % 0` NaN so the template never fired again, and
// dayOfMonth of 0 never equals any calendar day.
export function validateRecurrence(config: RecurrenceConfig): void {
  if (!isValidTimezone(config.timezone)) {
    throw new BadRequestException(
      `timezone must be a valid IANA time zone, got "${config.timezone}"`,
    );
  }

  // Checked for every type, not just everyNDays: a caller may set it
  // alongside any recurrence, and a stored negative would surface only later.
  if (config.streakDays != null) {
    requireInteger(config.streakDays, 'streakDays', 1, 366);
  }

  switch (config.recurrenceType) {
    case ListTemplateRecurrenceType.daily:
      return;

    case ListTemplateRecurrenceType.weekly: {
      if (config.weekDays.length === 0) {
        throw new BadRequestException(
          'weekly recurrence needs at least one weekDay',
        );
      }
      for (const day of config.weekDays) {
        requireInteger(day, 'weekDays entry', 0, 6);
      }
      if (new Set(config.weekDays).size !== config.weekDays.length) {
        throw new BadRequestException('weekDays must not repeat a day');
      }
      return;
    }

    case ListTemplateRecurrenceType.monthly:
      requireInteger(config.dayOfMonth, 'dayOfMonth', 1, 31);
      return;

    case ListTemplateRecurrenceType.everyNDays:
      // Rule 25: streakDays ON days then intervalDays OFF days. A rest period
      // below 1 would make the cycle equal the streak, which is `daily` by
      // another name and never what the caller meant.
      requireInteger(config.intervalDays, 'intervalDays', 1, 366);
      return;
  }
}
