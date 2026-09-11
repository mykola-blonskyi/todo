import { useTranslations } from 'next-intl';
import { Link } from '@shared/lib/i18n/navigation';
import { ModeToggle } from '@features/preferences';
import { LoginSignOutButton } from '@features/auth/components/LoginSignOutButton';
import type { ShellProps } from '../types';
import { BrandLink } from '../shared/BrandLink';
import { NavLink } from '../shared/NavLink';
import { navItems } from '../shared/nav';
import { Avatar } from '../shared/Avatar';

// Ledger: a flat toolbar, then full-width tables. Dense by design - the
// [data-layout=ledger] rules in globals.css shrink the primitives to match.
export function Shell({ locale, appearance, nav, children }: ShellProps) {
  const t = useTranslations('Nav');

  return (
    <div className="flex min-h-full flex-1 flex-col text-[13px]">
      <header className="sticky top-0 z-20 flex h-12 items-center gap-3 border-b bg-card px-4">
        <BrandLink locale={locale} />
        {nav ? (
          <>
            <nav
              aria-label={t('primary')}
              className="ml-2 flex items-center gap-1"
            >
              {navItems(nav).map((item) => (
                <NavLink
                  key={item.key}
                  item={item}
                  className="rounded-md border border-transparent px-2.5 py-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  activeClassName="border-border bg-secondary font-semibold text-foreground"
                >
                  {t(item.key)}
                  {item.count !== null ? (
                    <span className="ml-1 tabular-nums opacity-60">
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
                  className="rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary"
                >
                  {t('pendingInvites')}: {nav.pendingInvites.length}
                </Link>
              ) : null}
              <ModeToggle mode={appearance.mode} className="h-8 text-xs" />
              <Avatar
                person={nav.user}
                className="bg-primary text-primary-foreground"
              />
              <LoginSignOutButton locale={locale} />
            </div>
          </>
        ) : null}
      </header>
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
