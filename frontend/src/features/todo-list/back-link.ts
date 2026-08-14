interface BackLinkCategory {
  id: string;
}

// The List detail page's back-link returns to the category the User
// currently has this List filed under - depends only on the List's own
// category state for the viewing User (Rule 22), never on how they actually
// navigated here. Query param names match the dashboard filter shipped in
// TODO-33 (@features/categories/CategoryFilter.tsx): categoryId / uncategorized.
export function buildBackLinkHref(myCategory: BackLinkCategory | null): string {
  return myCategory ? `/?categoryId=${myCategory.id}` : '/?uncategorized=true';
}
