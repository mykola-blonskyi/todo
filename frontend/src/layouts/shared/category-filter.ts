import type { CategoryFilterState, ListOverview } from '../types';

export function parseCategoryFilter(searchParams: {
  categoryId?: string;
  uncategorized?: string;
  archived?: string;
}): CategoryFilterState {
  return {
    categoryId: searchParams.categoryId ?? null,
    uncategorizedOnly: searchParams.uncategorized === 'true',
    archivedOnly: searchParams.archived === 'true',
  };
}

export function isArchived(list: Pick<ListOverview, 'archivedAt'>): boolean {
  return list.archivedAt !== null;
}

// business-rules.md Rule 28. `keepId` survives the filter even when archived:
// a detail page's rail still has to show the List you have open.
export function activeLists(
  lists: ListOverview[],
  keepId?: string,
): ListOverview[] {
  return lists.filter((list) => !isArchived(list) || list.id === keepId);
}

export function isAllLists(filter: CategoryFilterState): boolean {
  return (
    !filter.categoryId && !filter.uncategorizedOnly && !filter.archivedOnly
  );
}

export function archivedLists(lists: ListOverview[]): ListOverview[] {
  return lists.filter(isArchived);
}

// Same semantics as the backend's myLists(categoryId, uncategorizedOnly)
// arguments, applied to the already-loaded unfiltered overview so the shell
// (which always needs every list for its counts) and the page share one query.
// The archive is exclusive, not another category: the only filter that shows
// archived Lists, and every other one hides them.
export function applyCategoryFilter(
  lists: ListOverview[],
  filter: CategoryFilterState,
): ListOverview[] {
  if (filter.archivedOnly) {
    return archivedLists(lists);
  }
  const live = activeLists(lists);
  if (filter.uncategorizedOnly) {
    return live.filter((list) => list.myCategory === null);
  }
  if (filter.categoryId) {
    return live.filter((list) => list.myCategory?.id === filter.categoryId);
  }
  return live;
}
