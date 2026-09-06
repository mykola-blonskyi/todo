import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@shared/lib/i18n/navigation';
import { cn } from '@shared/lib/utils';
import { CreateListForm } from '@features/todos-list';
import { PendingInviteRow } from '@features/list-sharing/PendingInviteRow';
import type { ListsPageProps } from '../types';
import { TuiHeading } from './Shell';
import { dueStatus, listProgress, sortByDue } from '../shared/list-stats';

// ASCII progress: 10 cells, █ for done, ░ for open - reads at a glance and
// stays monospace-aligned.
export function bar(percent: number, cells = 10): string {
  const filled = Math.round((percent / 100) * cells);
  return '█'.repeat(filled) + '░'.repeat(cells - filled);
}

export function ListsPage({ nav, lists, filter }: ListsPageProps) {
  const t = useTranslations('Terminal');
  const tNav = useTranslations('Nav');
  const tOverview = useTranslations('Overview');
  const locale = useLocale();

  const scope = filter.uncategorizedOnly
    ? tNav('uncategorized')
    : filter.categoryId
      ? (nav.categories.find((c) => c.id === filter.categoryId)?.name ?? '')
      : tNav('allLists');

  const ordered = sortByDue(lists);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-bold">
          <span className="text-muted-foreground"># </span>
          {scope.toLowerCase()}{' '}
          <span className="text-muted-foreground">({ordered.length})</span>
        </h1>
        <p className="text-muted-foreground">{t('listsHint')}</p>
      </div>

      {nav.pendingInvites.length > 0 ? (
        <section>
          <TuiHeading>
            {tNav('pendingInvites').toLowerCase()} ({nav.pendingInvites.length})
          </TuiHeading>
          <ul className="mt-1 flex flex-col gap-1">
            {nav.pendingInvites.map((invite) => (
              <PendingInviteRow key={invite.id} invite={invite} />
            ))}
          </ul>
        </section>
      ) : null}

      <ol className="flex flex-col">
        {ordered.length === 0 ? (
          <li className="text-muted-foreground">
            {tOverview('emptyFiltered')}
          </li>
        ) : null}
        {ordered.map((list, index) => {
          const progress = listProgress(list);
          const status = dueStatus(list.dueDate);
          return (
            <li key={list.id}>
              <Link
                href={`/lists/${list.id}`}
                data-tui-row=""
                className="grid grid-cols-[2ch_1fr_auto] gap-x-3 px-1 hover:bg-accent focus:bg-accent focus:outline-none sm:grid-cols-[2ch_minmax(0,1fr)_10ch_12ch_12ch]"
              >
                <span className="text-right text-muted-foreground">
                  {index + 1}
                </span>
                <span className="truncate">
                  {list.title}
                  <span className="text-muted-foreground">
                    {' '}
                    @
                    {(
                      list.myCategory?.name ?? tNav('uncategorized')
                    ).toLowerCase()}
                    {list.templateId ? ' ↻' : ''}
                    {list.collaborators.length > 0
                      ? ` +${list.collaborators.length}`
                      : ''}
                  </span>
                </span>
                <span
                  className="hidden text-primary sm:inline"
                  aria-label={`${progress.percent}%`}
                >
                  {bar(progress.percent)}
                </span>
                <span className="hidden tabular-nums text-muted-foreground sm:inline">
                  {progress.done}/{progress.total}
                </span>
                <span
                  className={cn(
                    'tabular-nums',
                    status === 'overdue'
                      ? 'font-bold text-destructive'
                      : 'text-muted-foreground',
                  )}
                >
                  {list.dueDate
                    ? status === 'overdue'
                      ? `! ${list.dueDate.slice(5, 10)}`
                      : new Intl.DateTimeFormat(locale, {
                          month: '2-digit',
                          day: '2-digit',
                        }).format(new Date(list.dueDate))
                    : '—'}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      <div className="max-w-md">
        <TuiHeading>{t('newList')}</TuiHeading>
        <CreateListForm />
      </div>
    </div>
  );
}
