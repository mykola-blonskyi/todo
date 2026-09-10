import { describe, expect, it } from 'vitest';
import {
  categoryHue,
  daysBetween,
  dueStatus,
  formatDueDate,
  formatOccurrenceDate,
  initials,
  sortByDue,
  taskProgress,
} from '@/layouts/shared/list-stats';
import {
  applyCategoryFilter,
  parseCategoryFilter,
} from '@/layouts/shared/category-filter';
import type { ListOverview } from '@/layouts/types';

function list(overrides: Partial<ListOverview>): ListOverview {
  return {
    id: 'l',
    title: 'L',
    dueDate: null,
    updatedAt: '2026-09-01T00:00:00.000Z',
    createdAt: '2026-09-01T00:00:00.000Z',
    templateId: null,
    archivedAt: null,
    isOwner: true,
    myCategory: null,
    tasks: [],
    collaborators: [],
    ...overrides,
  };
}

describe('list-stats', () => {
  it('computes progress, rounding the percentage', () => {
    expect(taskProgress([])).toEqual({ done: 0, total: 0, percent: 0 });
    expect(
      taskProgress([{ done: true }, { done: false }, { done: false }]),
    ).toEqual({ done: 1, total: 3, percent: 33 });
  });

  it('classifies due dates relative to a fixed today (date-only, no timezone)', () => {
    const today = '2026-09-06';
    expect(dueStatus(null, today)).toBe('none');
    expect(dueStatus('2026-09-05', today)).toBe('overdue');
    expect(dueStatus('2026-09-06T00:00:00.000Z', today)).toBe('today');
    expect(dueStatus('2026-09-13', today)).toBe('soon');
    expect(dueStatus('2026-09-14', today)).toBe('later');
    expect(daysBetween('2026-09-06', '2026-10-03')).toBe(27);
  });

  it('formats a date-only string without shifting the day', () => {
    expect(formatDueDate('2026-09-08', 'en')).toBe('Tue, Sep 8');
    expect(formatDueDate('2026-09-08T00:00:00.000Z', 'en')).toBe('Tue, Sep 8');
  });

  it('sorts dated lists first, ascending, keeping undated ones in place', () => {
    const sorted = sortByDue([
      list({ id: 'a', dueDate: null }),
      list({ id: 'b', dueDate: '2026-09-12' }),
      list({ id: 'c', dueDate: '2026-09-08' }),
    ]);
    expect(sorted.map((l) => l.id)).toEqual(['c', 'b', 'a']);
  });

  it('gives stable initials and hues', () => {
    expect(initials('Anna Kovalenko')).toBe('AK');
    expect(initials('mykola@example.com')).toBe('ME');
    expect(initials('')).toBe('?');
    expect(categoryHue('abc')).toBe(categoryHue('abc'));
    expect(categoryHue('abc')).toBeGreaterThanOrEqual(0);
    expect(categoryHue('abc')).toBeLessThan(360);
  });
});

describe('category filter', () => {
  const lists = [
    list({ id: 'work', myCategory: { id: 'c1', name: 'Work' } }),
    list({ id: 'home', myCategory: { id: 'c2', name: 'Home' } }),
    list({ id: 'none' }),
    list({
      id: 'old',
      myCategory: { id: 'c1', name: 'Work' },
      archivedAt: '2026-08-01T00:00:00.000Z',
    }),
  ];

  it('parses the same URL params the pre-layouts CategoryFilter used', () => {
    expect(parseCategoryFilter({})).toEqual({
      categoryId: null,
      uncategorizedOnly: false,
      archivedOnly: false,
    });
    expect(parseCategoryFilter({ categoryId: 'c1' })).toEqual({
      categoryId: 'c1',
      uncategorizedOnly: false,
      archivedOnly: false,
    });
    expect(parseCategoryFilter({ uncategorized: 'true' })).toEqual({
      categoryId: null,
      uncategorizedOnly: true,
      archivedOnly: false,
    });
    expect(parseCategoryFilter({ archived: 'true' })).toEqual({
      categoryId: null,
      uncategorizedOnly: false,
      archivedOnly: true,
    });
  });

  it('filters like the backend myLists arguments, minus the archive', () => {
    expect(
      applyCategoryFilter(lists, {
        categoryId: null,
        uncategorizedOnly: false,
        archivedOnly: false,
      }).map((l) => l.id),
    ).toEqual(['work', 'home', 'none']);
    expect(
      applyCategoryFilter(lists, {
        categoryId: 'c1',
        uncategorizedOnly: false,
        archivedOnly: false,
      }).map((l) => l.id),
    ).toEqual(['work']);
    expect(
      applyCategoryFilter(lists, {
        categoryId: null,
        uncategorizedOnly: true,
        archivedOnly: false,
      }).map((l) => l.id),
    ).toEqual(['none']);
  });

  it('shows only archived lists under the archive filter (Rule 28)', () => {
    expect(
      applyCategoryFilter(lists, {
        categoryId: null,
        uncategorizedOnly: false,
        archivedOnly: true,
      }).map((l) => l.id),
    ).toEqual(['old']);
  });

  it('ignores the category when the archive is asked for', () => {
    expect(
      applyCategoryFilter(lists, {
        categoryId: 'c2',
        uncategorizedOnly: false,
        archivedOnly: true,
      }).map((l) => l.id),
    ).toEqual(['old']);
  });
});

describe('formatOccurrenceDate', () => {
  it('omits the year for an occurrence in the current year', () => {
    expect(
      formatOccurrenceDate('2026-09-10T12:00:00.000Z', 'en', '2026-09-10'),
    ).toBe('Sep 10');
  });

  it('includes the year for an occurrence from another year', () => {
    expect(
      formatOccurrenceDate('2025-12-31T12:00:00.000Z', 'en', '2026-01-02'),
    ).toBe('Dec 31, 2025');
  });

  it('renders the stored UTC day regardless of the local timezone', () => {
    // 23:30 UTC is already the next day in Kyiv - the card must still show
    // the day the Occurrence is recorded under, not the viewer's.
    expect(
      formatOccurrenceDate('2026-09-10T23:30:00.000Z', 'en', '2026-09-11'),
    ).toBe('Sep 10');
  });

  it('formats in the requested locale', () => {
    expect(
      formatOccurrenceDate('2026-09-10T12:00:00.000Z', 'uk', '2026-09-10'),
    ).toContain('10');
  });
});
