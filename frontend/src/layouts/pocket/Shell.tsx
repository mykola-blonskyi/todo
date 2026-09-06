import { useTranslations } from 'next-intl';
import { Link } from '@shared/lib/i18n/navigation';
import type { ShellProps } from '../types';
import { TabBar } from './TabBar';

// Pocket: one phone-width column. On a phone that IS the screen; on a
// desktop it sits centered on the muted ground, still one-handed in spirit.
// Navigation lives in a fixed bottom tab bar; each page adds its own FAB.
export function Shell({ locale, nav, children }: ShellProps) {
  const t = useTranslations('Nav');

  return (
    <div className="flex min-h-full flex-1 flex-col items-center bg-secondary/60">
      <div className="relative flex min-h-full w-full max-w-md flex-1 flex-col bg-background shadow-[0_0_0_1px_hsl(var(--border))] sm:my-0">
        <header className="flex items-center justify-between px-5 pb-1 pt-4 text-xs font-bold text-muted-foreground">
          <Link href="/" className="text-foreground">
            Todolist
          </Link>
          <a
            href={`${process.env.HUB_URL}/${locale}/projects`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground"
          >
            blonskyi.dev ↗
          </a>
        </header>
        <main
          className={
            nav
              ? 'flex flex-1 flex-col px-4 pb-28 pt-2'
              : 'flex flex-1 flex-col'
          }
        >
          {children}
        </main>
        {nav ? (
          <TabBar
            label={t('primary')}
            pendingInvites={nav.pendingInvites.length}
          />
        ) : null}
      </div>
    </div>
  );
}
