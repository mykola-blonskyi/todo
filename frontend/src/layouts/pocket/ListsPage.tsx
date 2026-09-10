import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@shared/lib/i18n/navigation';
import { cn } from '@shared/lib/utils';
import {
  CreateListForm,
  ListSelectionBar,
  ListSelectionCheckbox,
  ListSelectionToggle,
} from '@features/todos-list';
import { PendingInviteRow } from '@features/list-sharing/PendingInviteRow';
import type { ListsPageProps } from '../types';
import { RestoreListButton } from '@features/todo-list';
import { Sheet } from './Sheet';
import { ProgressRing } from '../shared/ProgressBar';
import { ArchiveFilterLink } from '../shared/ArchiveFilterLink';
import { archivedLists, isAllLists } from '../shared/category-filter';
import {
  categoryColor,
  dueStatus,
  formatDueDate,
  formatOccurrenceDate,
  listProgress,
  sortByDue,
} from '../shared/list-stats';

export function ListsPage({ nav, lists, filter }: ListsPageProps) {
  const t = useTranslations('Pocket');
  const tNav = useTranslations('Nav');
  const tOverview = useTranslations('Overview');
  const tLists = useTranslations('Lists');
  const locale = useLocale();
  const today = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  const chips = [
    {
      key: 'all',
      href: '/' as const,
      label: tNav('allLists'),
      active: isAllLists(filter),
    },
    ...nav.categories.map((category) => ({
      key: category.id,
      href: `/?categoryId=${category.id}` as const,
      label: category.name,
      active: filter.categoryId === category.id,
    })),
    {
      key: 'none',
      href: '/?uncategorized=true' as const,
      label: tNav('uncategorized'),
      active: filter.uncategorizedOnly,
    },
  ];

  return (
    <>
      <div className="flex items-end justify-between gap-2">
        <h1 className="text-3xl font-extrabold leading-tight tracking-tight">
          <span className="block text-xs font-bold text-muted-foreground">
            {today}
          </span>
          {tNav('lists')}
        </h1>
        <ListSelectionToggle />
      </div>
      <ListSelectionBar className="mt-3" />
      <nav
        aria-label={tNav('categories')}
        className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1"
      >
        {chips.map((chip) => (
          <Link
            key={chip.key}
            href={chip.href}
            className={cn(
              'whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-bold',
              chip.active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-foreground',
            )}
          >
            {chip.label}
          </Link>
        ))}
        <ArchiveFilterLink
          filter={filter}
          count={archivedLists(nav.lists).length}
          className="whitespace-nowrap rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground"
          activeClassName="border-primary bg-primary text-primary-foreground"
          countClassName="tabular-nums opacity-70"
        />
      </nav>

      {nav.pendingInvites.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-2">
          {nav.pendingInvites.map((invite) => (
            <PendingInviteRow key={invite.id} invite={invite} />
          ))}
        </ul>
      ) : null}

      <ul className="mt-4 flex flex-col gap-2.5">
        {lists.length === 0 ? (
          <li className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            {tOverview('emptyFiltered')}
          </li>
        ) : null}
        {sortByDue(lists).map((list) => {
          const progress = listProgress(list);
          const status = dueStatus(list.dueDate);
          return (
            <li key={list.id} className="flex items-center gap-2">
              <ListSelectionCheckbox list={list} className="shrink-0" />
              <Link
                href={`/lists/${list.id}`}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-card p-3.5 shadow-[0_1px_2px_hsl(var(--foreground)/0.06)] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99]"
              >
                <span
                  aria-hidden="true"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-base font-extrabold"
                  style={{
                    background: list.myCategory
                      ? categoryColor(list.myCategory.id, 0.15)
                      : 'hsl(var(--secondary))',
                    color: list.myCategory
                      ? categoryColor(list.myCategory.id)
                      : 'hsl(var(--muted-foreground))',
                  }}
                >
                  {list.title.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-extrabold">
                    {list.title}
                  </span>
                  <span
                    className={cn(
                      'block truncate text-xs font-semibold text-muted-foreground',
                      status === 'overdue' && 'text-destructive',
                    )}
                  >
                    {list.myCategory?.name ?? tNav('uncategorized')}
                    {list.dueDate
                      ? ` · ${status === 'overdue' ? tOverview('overdue') : formatDueDate(list.dueDate, locale)}`
                      : ''}
                    {' · '}
                    {progress.done}/{progress.total}
                    {list.templateId
                      ? ` · ↻ ${formatOccurrenceDate(list.createdAt, locale)}`
                      : ''}
                  </span>
                </span>
                <ProgressRing progress={progress} size={38} />
              </Link>
              <RestoreListButton list={list} className="mt-1.5" />
            </li>
          );
        })}
      </ul>

      <Sheet label={t('newList')} closeLabel={t('close')}>
        <CreateListForm />
        <p className="text-xs text-muted-foreground">
          {tLists('createPlaceholder')}
        </p>
      </Sheet>
    </>
  );
}
