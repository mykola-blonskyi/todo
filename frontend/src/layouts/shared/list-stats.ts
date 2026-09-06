import type { ListOverview, TaskOverview } from '../types';

export interface Progress {
  done: number;
  total: number;
  percent: number;
}

export function taskProgress(tasks: Pick<TaskOverview, 'done'>[]): Progress {
  const total = tasks.length;
  const done = tasks.filter((task) => task.done).length;
  return {
    done,
    total,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

export function listProgress(list: Pick<ListOverview, 'tasks'>): Progress {
  return taskProgress(list.tasks);
}

export type DueStatus = 'none' | 'overdue' | 'today' | 'soon' | 'later';

// Due dates are date-only (business-rules: no time-of-day), compared as
// YYYY-MM-DD strings against `today` so server and client agree regardless
// of timezone. "soon" = within the next 7 days.
export function dueStatus(
  dueDate: string | null | undefined,
  today: string = todayIso(),
): DueStatus {
  if (!dueDate) return 'none';
  const due = dueDate.slice(0, 10);
  if (due < today) return 'overdue';
  if (due === today) return 'today';
  const diff = daysBetween(today, due);
  return diff <= 7 ? 'soon' : 'later';
}

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

// Stable, palette-independent hue per category so the same category keeps
// its colour across lists, layouts and reloads. Kept as HSL parts so callers
// can build `hsl(h s% l%)` or a translucent variant.
export function categoryHue(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}

export function categoryColor(id: string, alpha = 1): string {
  return `hsl(${categoryHue(id)} 55% 50% / ${alpha})`;
}

export function initials(nameOrEmail: string): string {
  const source = nameOrEmail.trim();
  if (!source) return '?';
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function sortByDue<T extends { dueDate: string | null }>(
  lists: T[],
): T[] {
  return [...lists].sort((a, b) => {
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });
}
