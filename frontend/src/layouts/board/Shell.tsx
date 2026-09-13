import { useTranslations } from 'next-intl';
import { Link } from '@shared/lib/i18n/navigation';
import { ModeToggle } from '@features/preferences';
import { LoginSignOutButton } from '@features/auth/components/LoginSignOutButton';
import type { ShellProps } from '../types';
import { BrandLink } from '../shared/BrandLink';
import { NavLink } from '../shared/NavLink';
import { navItems } from '../shared/nav';
import { Avatar } from '../shared/Avatar';

// Board: a single top bar with pill navigation; everything below is a wide,
// horizontally scrolling canvas of columns.
export function Shell({ locale, appearance, nav, children }: ShellProps) {
  const t = useTranslations('Nav');

  return (
    <div className="flex min-h-full flex-1 flex-col bg-muted/40">
      <header className="sticky top-0 z-20 border-b bg-card">
        <div className="flex h-14 items-center gap-4 px-4 md:px-6">
          <BrandLink locale={locale} />
          {nav ? (
            <>
              <nav
                aria-label={t('primary')}
                className="hidden items-center rounded-full bg-secondary p-1 md:flex"
              >
                {navItems(nav).map((item) => (
                  <NavLink
                    key={item.key}
                    item={item}
                    className="rounded-full px-3 py-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    activeClassName="bg-card text-foreground shadow-sm"
                  >
                    {t(item.key)}
                    {item.count ? (
                      <span className="ml-1.5 text-xs tabular-nums opacity-70">
                        {item.count}
                      </span>
                    ) : null}
                  </NavLink>
                ))}
              </nav>
              <div className="ml-auto flex items-center gap-2">
                {nav.pendingInvites.length > 0 ? (
                  <Link
                    href="/"
                    className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary"
                  >
                    {t('pendingInvites')} · {nav.pendingInvites.length}
                  </Link>
                ) : null}
                <ModeToggle
                  mode={appearance.mode}
                  className="h-8 rounded-full text-xs"
                />
                <Avatar
                  person={nav.user}
                  size="md"
                  className="bg-primary text-primary-foreground"
                />
                <LoginSignOutButton locale={locale} />
              </div>
            </>
          ) : null}
        </div>
        {nav ? (
          <nav
            aria-label={t('primary')}
            className="flex gap-1 overflow-x-auto px-3 pb-2 md:hidden"
          >
            {navItems(nav).map((item) => (
              <NavLink
                key={item.key}
                item={item}
                className="whitespace-nowrap rounded-full px-3 py-1 text-sm font-semibold text-muted-foreground"
                activeClassName="bg-secondary text-foreground"
              >
                {t(item.key)}
              </NavLink>
            ))}
          </nav>
        ) : null}
      </header>
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
