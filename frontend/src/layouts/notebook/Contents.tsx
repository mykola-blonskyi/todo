import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@shared/lib/i18n/navigation';
import { cn } from '@shared/lib/utils';
import { Button } from '@ui/components/button';
import { Input } from '@ui/components/input';
import { createListAction } from '@features/todos-list';
import { RestoreListButton } from '@features/todo-list';
import type { ListOverview } from '../types';
import {
  dueStatus,
  formatDueDate,
  formatOccurrenceDate,
  listProgress,
  sortByDue,
} from '../shared/list-stats';

interface ContentsProps {
  lists: ListOverview[];
  heading?: string;
  activeListId?: string;
  emptyText: string;
}

// The left page: a table of contents. Title, dotted leader, "done / total"
// as the page number; the open list gets an arrow, overdue ones a red "!".
export function Contents({
  lists,
  heading,
  activeListId,
  emptyText,
}: ContentsProps) {
  const t = useTranslations('Notebook');
  const tLists = useTranslations('Lists');
  const tNav = useTranslations('Nav');
  const locale = useLocale();

  return (
    <>
      <h2 className="nb-hand text-4xl font-semibold leading-8">
        {heading ?? t('contents')}
      </h2>
      <ul className="mt-8">
        {lists.length === 0 ? (
          <li className="italic text-muted-foreground">{emptyText}</li>
        ) : null}
        {sortByDue(lists).map((list) => {
          const progress = listProgress(list);
          const status = dueStatus(list.dueDate);
          const active = list.id === activeListId;
          return (
            <li key={list.id} className="flex items-baseline gap-2 leading-8">
              <Link
                href={`/lists/${list.id}`}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'shrink-0 hover:underline',
                  active && 'font-semibold text-primary',
                )}
              >
                {active ? '→ ' : ''}
                {list.title}
                <span className="nb-hand ml-2 text-base text-muted-foreground">
                  {list.myCategory?.name ?? tNav('uncategorized')}
                  {list.dueDate
                    ? ` · ${formatDueDate(list.dueDate, locale)}`
                    : ''}
                  {list.templateId
                    ? ` · ↻ ${formatOccurrenceDate(list.createdAt, locale)}`
                    : ''}
                </span>
              </Link>
              <span
                aria-hidden="true"
                className="mx-1 flex-1 -translate-y-1.5 border-b-2 border-dotted border-muted-foreground/60"
              />
              <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                {progress.done} / {progress.total}
                {status === 'overdue' ? (
                  <span
                    className="nb-hand ml-1 text-xl text-destructive"
                    title={t('overdue')}
                  >
                    !
                  </span>
                ) : null}
              </span>
              <RestoreListButton list={list} />
            </li>
          );
        })}
      </ul>
      <form action={createListAction} className="mt-6 flex items-center gap-2">
        <Input
          name="title"
          required
          placeholder={t('newPage')}
          aria-label={tLists('createPlaceholder')}
          className="nb-hand h-8 border-0 border-b border-dashed bg-transparent px-0 text-xl shadow-none focus-visible:ring-0"
        />
        <Button
          type="submit"
          size="sm"
          variant="ghost"
          className="nb-hand text-lg"
        >
          {tLists('createButton')}
        </Button>
      </form>
    </>
  );
}
