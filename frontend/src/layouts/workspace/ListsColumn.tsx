import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@shared/lib/i18n/navigation';
import { cn } from '@shared/lib/utils';
import { CreateListForm } from '@features/todos-list';
import type { CategoryFilterState, ListOverview, NavData } from '../types';
import { ProgressBar } from '../shared/ProgressBar';
import { AvatarStack } from '../shared/Avatar';
import {
  categoryColor,
  dueStatus,
  formatDueDate,
  formatOccurrenceDate,
  listProgress,
  sortByDue,
} from '../shared/list-stats';

interface ListsColumnProps {
  nav: NavData;
  lists: ListOverview[];
  filter?: CategoryFilterState;
  activeListId?: string;
}

// The middle pane: every list (already filtered) as a compact row with
// progress and due date; the active one is highlighted on the detail page.
export function ListsColumn({
  nav,
  lists,
  filter,
  activeListId,
}: ListsColumnProps) {
  const t = useTranslations('Nav');
  const tOverview = useTranslations('Overview');
  const locale = useLocale();

  const heading = filter?.uncategorizedOnly
    ? t('uncategorized')
    : filter?.categoryId
      ? (nav.categories.find((c) => c.id === filter.categoryId)?.name ??
        t('allLists'))
      : t('allLists');

  return (
    <section
      aria-label={heading}
      className="flex w-full shrink-0 flex-col border-b md:w-80 md:border-b-0 md:border-r"
    >
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <h2 className="text-sm font-semibold">{heading}</h2>
        <span className="text-xs tabular-nums text-muted-foreground">
          {lists.length}
        </span>
      </div>
      <div className="px-3 pb-2">
        <CreateListForm />
      </div>
      {lists.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          {tOverview('emptyFiltered')}
        </p>
      ) : (
        <ul className="flex flex-col">
          {sortByDue(lists).map((list) => {
            const progress = listProgress(list);
            const status = dueStatus(list.dueDate);
            const active = list.id === activeListId;
            return (
              <li key={list.id}>
                <Link
                  href={`/lists/${list.id}`}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'block border-b px-4 py-2.5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                    active &&
                      'bg-accent shadow-[inset_3px_0_0_hsl(var(--primary))]',
                  )}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium">
                      {list.title}
                    </span>
                    {list.dueDate ? (
                      <span
                        className={cn(
                          'shrink-0 text-xs tabular-nums',
                          status === 'overdue'
                            ? 'font-medium text-destructive'
                            : 'text-muted-foreground',
                        )}
                      >
                        {formatDueDate(list.dueDate, locale)}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{
                        background: list.myCategory
                          ? categoryColor(list.myCategory.id)
                          : 'hsl(var(--border))',
                      }}
                    />
                    <span className="truncate">
                      {list.myCategory?.name ?? t('uncategorized')}
                      {' · '}
                      {progress.done}/{progress.total}
                    </span>
                    {list.templateId ? (
                      <span title={tOverview('recurring')}>
                        ↻ {formatOccurrenceDate(list.createdAt, locale)}
                      </span>
                    ) : null}
                    <ProgressBar progress={progress} className="w-14" />
                    <AvatarStack
                      people={list.collaborators}
                      max={2}
                      className="ml-auto"
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
