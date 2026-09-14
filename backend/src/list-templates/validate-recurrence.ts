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

export function validateRecurrence(config: RecurrenceConfig): void {
  if (!isValidTimezone(config.timezone)) {
    throw new BadRequestException(
      `timezone must be a valid IANA time zone, got "${config.timezone}"`,
    );
  }

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
      requireInteger(config.intervalDays, 'intervalDays', 1, 366);
      return;
  }
}
