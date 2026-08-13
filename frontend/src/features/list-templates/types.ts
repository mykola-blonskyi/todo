import type { Collaborator } from '@features/list-sharing';

export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'everyNDays';
export type TemplateStatus = 'active' | 'paused';

export interface ListTemplate {
  id: string;
  title: string;
  taskTitles: string[];
  recurrenceType: RecurrenceType;
  weekDays: number[];
  dayOfMonth: number | null;
  intervalDays: number | null;
  streakDays: number | null;
  streakStartDate: string | null;
  timezone: string;
  status: TemplateStatus;
  collaborators: Collaborator[];
}
