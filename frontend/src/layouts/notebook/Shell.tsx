import { useTranslations } from 'next-intl';
import { Link } from '@shared/lib/i18n/navigation';
import { ModeToggle } from '@features/preferences';
import { LoginSignOutButton } from '@features/auth/components/LoginSignOutButton';
import type { ShellProps } from '../types';
import { NavLink } from '../shared/NavLink';
import { navItems } from '../shared/nav';

// Notebook: a desk (dotted ground) with a thin strip of links above the
// spread. The pages themselves come from Spread.tsx.
export function Shell({ locale, nav, children }: ShellProps) {
  const t = useTranslations('Nav');

  return (
    <div
      className="flex min-h-full flex-1 flex-col"
      style={{
        backgroundImage:
          'radial-gradient(hsl(var(--foreground) / 0.07) 1px, transparent 1px)',
        backgroundSize: '18px 18px',
      }}
    >
      <header className="flex flex-wrap items-center gap-x-5 gap-y-2 px-6 pb-2 pt-4 text-sm text-muted-foreground md:px-10">
        <Link
          href="/"
          className="nb-hand text-2xl font-semibold text-foreground"
        >
          Todolist
        </Link>
        <a
          href={`${process.env.HUB_URL}/${locale}/projects`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs hover:text-foreground"
        >
          blonskyi.dev ↗
        </a>
        {nav ? (
          <>
            <nav aria-label={t('primary')} className="flex items-center gap-4">
              {navItems(nav).map((item) => (
                <NavLink
                  key={item.key}
                  item={item}
                  className="border-b border-dotted border-transparent hover:text-foreground"
                  activeClassName="border-foreground text-foreground"
                >
                  {t(item.key)}
                  {item.count ? (
                    <sup className="ml-0.5 text-[10px]">{item.count}</sup>
                  ) : null}
                </NavLink>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-3">
              {nav.pendingInvites.length > 0 ? (
                <Link href="/" className="nb-hand text-lg text-primary">
                  {t('pendingInvites')} ({nav.pendingInvites.length})
                </Link>
              ) : null}
              <span className="hidden text-xs sm:inline">
                {nav.user.name ?? nav.user.email}
              </span>
              <ModeToggle className="h-7 border-0 bg-transparent px-1 text-xs" />
              <LoginSignOutButton locale={locale} />
            </div>
          </>
        ) : null}
      </header>
      <main className="flex min-w-0 flex-1 flex-col px-3 pb-10 md:px-10">
        {children}
      </main>
    </div>
  );
}
