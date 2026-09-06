import type { NavData } from '../types';

export type NavKey = 'lists' | 'templates' | 'categories' | 'settings';

export interface NavItem {
  key: NavKey;
  href: '/' | '/templates' | '/categories' | '/settings';
  count: number | null;
}

// The same four destinations in every shell; each shell decides how to draw
// them (sidebar, top bar, tab bar, tree...). Counts are the live totals the
// nav data already carries, so no extra query.
export function navItems(nav: NavData | null): NavItem[] {
  return [
    { key: 'lists', href: '/', count: nav ? nav.lists.length : null },
    {
      key: 'templates',
      href: '/templates',
      count: nav ? nav.templates.length : null,
    },
    {
      key: 'categories',
      href: '/categories',
      count: nav ? nav.categories.length : null,
    },
    { key: 'settings', href: '/settings', count: null },
  ];
}

// Which nav item a pathname belongs to. Pathnames arrive without the locale
// prefix (next-intl's usePathname strips it).
export function activeNavKey(pathname: string): NavKey {
  if (pathname.startsWith('/templates')) return 'templates';
  if (pathname.startsWith('/categories')) return 'categories';
  if (pathname.startsWith('/settings')) return 'settings';
  return 'lists';
}
