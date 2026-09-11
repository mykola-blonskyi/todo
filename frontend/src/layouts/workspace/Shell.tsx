import { useTranslations } from 'next-intl';
import { Link } from '@shared/lib/i18n/navigation';
import { ModeToggle } from '@features/preferences';
import { LoginSignOutButton } from '@features/auth/components/LoginSignOutButton';
import type { ShellProps } from '../types';
import { BrandLink } from '../shared/BrandLink';
import { NavLink } from '../shared/NavLink';
import { navItems } from '../shared/nav';
import { Avatar } from '../shared/Avatar';
import { ArchiveFilterLink } from '../shared/ArchiveFilterLink';
import { activeLists, archivedLists } from '../shared/category-filter';
import { categoryColor } from '../shared/list-stats';

// Workspace: persistent left sidebar (nav + categories + user), content to
// the right. Pages then split the content into a list column and a detail
// pane themselves (ListsColumn), so the same three-pane rhythm holds on
// every screen.
export function Shell({ locale, appearance, nav, children }: ShellProps) {
  const t = useTranslations('Nav');

  if (!nav) {
    return <div className="flex min-h-full flex-1 flex-col">{children}</div>;
  }

  const items = navItems(nav);
  const countByCategory = new Map<string, number>();
  let uncategorized = 0;
  for (const list of activeLists(nav.lists)) {
    if (list.myCategory) {
      countByCategory.set(
        list.myCategory.id,
        (countByCategory.get(list.myCategory.id) ?? 0) + 1,
      );
    } else {
      uncategorized += 1;
    }
  }

  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col gap-4 border-b bg-muted/60 p-3 md:sticky md:top-0 md:h-screen md:w-60 md:border-b-0 md:border-r">
        <BrandLink locale={locale} className="px-2 pt-1" />

        <nav aria-label={t('primary')} className="flex flex-col gap-0.5">
          {items.map((item) => (
            <NavLink
              key={item.key}
              item={item}
              className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              activeClassName="bg-accent font-medium text-accent-foreground"
            >
              <span>{t(item.key)}</span>
              {item.count !== null ? (
                <span className="text-xs tabular-nums text-muted-foreground">
                  {item.count}
                </span>
              ) : null}
            </NavLink>
          ))}
          {nav.pendingInvites.length > 0 ? (
            <Link
              href="/"
              className="mt-1 flex items-center justify-between rounded-md bg-primary/10 px-2 py-1.5 text-sm text-primary"
            >
              <span>{t('pendingInvites')}</span>
              <span className="text-xs font-semibold tabular-nums">
                {nav.pendingInvites.length}
              </span>
            </Link>
          ) : null}
        </nav>

        <div className="hidden flex-col gap-1 md:flex">
          <div className="flex items-center justify-between px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <span>{t('categories')}</span>
            <Link href="/categories" className="hover:text-foreground">
              +
            </Link>
          </div>
          <nav aria-label={t('categories')} className="flex flex-col gap-0.5">
            {nav.categories.map((category) => (
              <Link
                key={category.id}
                href={`/?categoryId=${category.id}`}
                className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-accent hover:text-accent-foreground"
              >
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: categoryColor(category.id) }}
                />
                <span className="truncate">{category.name}</span>
                <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                  {countByCategory.get(category.id) ?? 0}
                </span>
              </Link>
            ))}
            <Link
              href="/?uncategorized=true"
              className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full bg-border"
              />
              <span className="truncate">{t('uncategorized')}</span>
              <span className="ml-auto text-xs tabular-nums">
                {uncategorized}
              </span>
            </Link>
            <ArchiveFilterLink
              count={archivedLists(nav.lists).length}
              className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              countClassName="ml-auto text-xs tabular-nums"
            />
          </nav>
        </div>

        <div className="mt-auto flex flex-col gap-2 px-1 pt-3 text-xs md:border-t">
          <div className="flex items-center gap-2">
            <Avatar
              person={nav.user}
              className="bg-primary text-primary-foreground"
            />
            <span className="truncate font-medium">
              {nav.user.name ?? nav.user.email}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <ModeToggle mode={appearance.mode} className="h-7 px-1 text-xs" />
            <LoginSignOutButton locale={locale} />
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
