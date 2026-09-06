import { useTranslations } from 'next-intl';
import { Link } from '@shared/lib/i18n/navigation';
import { ModeToggle } from '@features/preferences';
import { LoginSignOutButton } from '@features/auth/components/LoginSignOutButton';
import type { ShellProps } from '../types';
import { NavLink } from '../shared/NavLink';
import { navItems } from '../shared/nav';
import { listProgress } from '../shared/list-stats';
import { CommandLine } from './CommandLine';
import { TuiKeys } from './TuiKeys';

// Terminal: status bar · tree sidebar · main pane · command line. Everything
// is monospace and keyboard-first (TuiKeys + CommandLine); the mouse still
// works everywhere.
export function Shell({ locale, nav, children }: ShellProps) {
  const t = useTranslations('Terminal');
  const tNav = useTranslations('Nav');

  if (!nav) {
    return (
      <div className="flex min-h-full flex-1 flex-col text-sm">{children}</div>
    );
  }

  const groups = [
    ...nav.categories.map((category) => ({
      key: category.id,
      name: category.name.toLowerCase(),
      href: `/?categoryId=${category.id}` as const,
      lists: nav.lists.filter((list) => list.myCategory?.id === category.id),
    })),
    {
      key: 'uncategorized',
      name: tNav('uncategorized').toLowerCase(),
      href: '/?uncategorized=true' as const,
      lists: nav.lists.filter((list) => !list.myCategory),
    },
  ].filter((group) => group.lists.length > 0 || group.key !== 'uncategorized');

  const done = nav.lists.reduce(
    (sum, list) => sum + listProgress(list).done,
    0,
  );
  const total = nav.lists.reduce((sum, list) => sum + list.tasks.length, 0);

  return (
    <div className="flex min-h-full flex-1 flex-col text-[13px] leading-6">
      <header className="flex items-stretch overflow-x-auto bg-primary text-xs text-primary-foreground">
        <Link
          href="/"
          className="bg-foreground px-3 font-bold uppercase tracking-wider text-background"
        >
          todolist
        </Link>
        <a
          href={`${process.env.HUB_URL}/${locale}/projects`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 opacity-80 hover:opacity-100"
        >
          ~/blonskyi.dev
        </a>
        <nav aria-label={tNav('primary')} className="flex">
          {navItems(nav).map((item) => (
            <NavLink
              key={item.key}
              item={item}
              className="px-3 opacity-80 hover:opacity-100"
              activeClassName="bg-primary-foreground/15 font-bold opacity-100"
            >
              {tNav(item.key).toLowerCase()}
              {item.count !== null ? `:${item.count}` : ''}
            </NavLink>
          ))}
        </nav>
        <span className="flex-1" />
        <span className="px-3 tabular-nums">
          {done}/{total} {t('done')}
        </span>
        {nav.pendingInvites.length > 0 ? (
          <Link href="/" className="bg-primary-foreground/15 px-3 font-bold">
            {nav.pendingInvites.length} {t('invites')}
          </Link>
        ) : null}
        <span className="hidden px-3 sm:inline">{nav.user.email}</span>
        <ModeToggle className="h-6 rounded-none border-0 bg-transparent px-1 text-xs text-primary-foreground" />
        <span className="flex items-center pr-2 [&_button]:h-6 [&_button]:px-2 [&_button]:text-xs [&_button]:text-primary-foreground">
          <LoginSignOutButton locale={locale} />
        </span>
      </header>

      <div className="flex flex-1 flex-col md:flex-row">
        <aside className="shrink-0 border-b p-3 md:w-64 md:border-b-0 md:border-r">
          <TuiHeading>{tNav('lists')}</TuiHeading>
          <ul>
            {groups.map((group) => (
              <li key={group.key}>
                <Link
                  href={group.href}
                  className="font-semibold text-primary hover:underline"
                >
                  ▾ {group.name}
                </Link>
                <span className="text-muted-foreground">
                  {' '}
                  {group.lists.length}
                </span>
                <ul>
                  {group.lists.map((list) => {
                    const progress = listProgress(list);
                    return (
                      <li key={list.id} className="truncate pl-4">
                        <Link
                          href={`/lists/${list.id}`}
                          className="hover:underline"
                        >
                          {list.title}
                        </Link>
                        <span className="text-muted-foreground">
                          {' '}
                          {progress.done}/{progress.total}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
          <TuiHeading className="mt-4">
            {tNav('templates').toLowerCase()}
          </TuiHeading>
          <ul>
            {nav.templates.map((template) => (
              <li key={template.id} className="truncate">
                <Link
                  href={`/templates/${template.id}`}
                  className="hover:underline"
                >
                  {template.title}
                </Link>
                {template.status === 'paused' ? (
                  <span className="text-muted-foreground"> {t('paused')}</span>
                ) : null}
              </li>
            ))}
            {nav.templates.length === 0 ? (
              <li className="text-muted-foreground">{t('none')}</li>
            ) : null}
          </ul>
        </aside>
        <main className="flex min-w-0 flex-1 flex-col p-4">{children}</main>
      </div>

      <CommandLine
        lists={nav.lists.map((list) => ({ id: list.id, title: list.title }))}
        templates={nav.templates.map((template) => ({
          id: template.id,
          title: template.title,
        }))}
      />
      <TuiKeys />
    </div>
  );
}

export function TuiHeading({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={`text-[11px] uppercase tracking-[0.15em] text-muted-foreground ${className ?? ''}`}
    >
      ── {children} ──
    </h2>
  );
}
