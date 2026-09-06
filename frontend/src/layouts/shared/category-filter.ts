import type { CategoryFilterState, ListOverview } from '../types';

export function parseCategoryFilter(searchParams: {
  categoryId?: string;
  uncategorized?: string;
}): CategoryFilterState {
  return {
    categoryId: searchParams.categoryId ?? null,
    uncategorizedOnly: searchParams.uncategorized === 'true',
  };
}

// Same semantics as the backend's myLists(categoryId, uncategorizedOnly)
// arguments, applied to the already-loaded unfiltered overview so the shell
// (which always needs every list for its counts) and the page share one query.
export function applyCategoryFilter(
  lists: ListOverview[],
  filter: CategoryFilterState,
): ListOverview[] {
  if (filter.uncategorizedOnly) {
    return lists.filter((list) => list.myCategory === null);
  }
  if (filter.categoryId) {
    return lists.filter((list) => list.myCategory?.id === filter.categoryId);
  }
  return lists;
}
