import { headers } from 'next/headers';
import { ChevronRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@shared/lib/i18n/navigation';
import { ThemeToggle, LocaleSwitcher } from '@features/preferences';
import { LoginSignOutButton } from '@features/auth/components/LoginSignOutButton';

interface HeaderProps {
  locale: string;
}

// Structure/tokens mirror the hub's own Header (~/workspace/my-projects/src/shared/ui/header.tsx).
// One deliberate deviation: the hub only shows its own "blonskyi.dev" brand mark, but todolist is a
// sub-app under it, so this adds a second breadcrumb segment with a separator. Sign-out carries over
// from the hub too, now that todolist owns a real session of its own (ADR-016); the hub's avatar
// doesn't, and Settings stays separate since it hosts feature state (Google Calendar connect,
// TODO-17), not account management.
export const Header = async ({ locale }: HeaderProps) => {
  const [t, headerList] = await Promise.all([
    getTranslations('Settings'),
    headers(),
  ]);
  // proxy.ts sets this only on gated pages, so it's absent on /[locale]/login -
  // exactly where a sign-out control would be nonsense.
  const isAuthenticated = headerList.get('x-user-id') !== null;

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <a
            href={`${process.env.HUB_URL}/${locale}/projects`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-sm text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            blonskyi.dev
          </a>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <Link
            href="/"
            className="rounded-sm text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Todolist
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="rounded-sm px-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t('title')}
          </Link>
          <ThemeToggle />
          <LocaleSwitcher />
          {isAuthenticated && <LoginSignOutButton locale={locale} />}
        </div>
      </div>
    </header>
  );
};
