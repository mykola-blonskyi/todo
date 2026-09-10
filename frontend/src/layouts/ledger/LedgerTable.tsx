'use client';

import { useMemo, useOptimistic, useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronRight, ExternalLink } from 'lucide-react';
import { Link, useRouter } from '@shared/lib/i18n/navigation';
import { cn } from '@shared/lib/utils';
import { Checkbox } from '@ui/components/checkbox';
import { Button } from '@ui/components/button';
import { Input } from '@ui/components/input';
import {
  toggleTaskDoneAction,
  createTaskAction,
} from '@features/todo-list/actions';
import { RestoreListButton } from '@features/todo-list';
import { ListSelectionCheckbox } from '@features/todos-list';
import type { ListOverview } from '../types';
import { ProgressBar } from '../shared/ProgressBar';
import { AvatarStack } from '../shared/Avatar';
import {
  categoryColor,
  dueStatus,
  formatDueDate,
  formatOccurrenceDate,
  formatRelativeDay,
  listProgress,
} from '../shared/list-stats';

type SortKey = 'title' | 'progress' | 'due' | 'updated';
type Quick = 'all' | 'overdue' | 'shared' | 'recurring';

interface LedgerTableProps {
  lists: ListOverview[];
}

// Sortable, filterable table of lists; a row expands in place into its
// tasks with a working done-toggle and quick-add, so most day-to-day work
// never needs the full page. Sorting/filtering/expansion are client state;
// task changes go through the usual Server Actions with an optimistic flip.
export function LedgerTable({ lists }: LedgerTableProps) {
  const t = useTranslations('Ledger');
  const tOverview = useTranslations('Overview');
  const tNav = useTranslations('Nav');
  const tTasks = useTranslations('Tasks');
  const locale = useLocale();
  const router = useRouter();
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({
    key: 'due',
    dir: 1,
  });
  const [quick, setQuick] = useState<Quick>('all');
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [isPending, startTransition] = useTransition();
  const [rows, flipTask] = useOptimistic(
    lists,
    (state, flip: { listId: string; taskId: string }) =>
      state.map((list) =>
        list.id === flip.listId
          ? {
              ...list,
              tasks: list.tasks.map((task) =>
                task.id === flip.taskId ? { ...task, done: !task.done } : task,
              ),
            }
          : list,
      ),
  );

  const visible = useMemo(() => {
    const filtered = rows.filter((list) => {
      if (quick === 'overdue') return dueStatus(list.dueDate) === 'overdue';
      if (quick === 'shared') return list.collaborators.length > 0;
      if (quick === 'recurring') return list.templateId !== null;
      return true;
    });
    const cmp: Record<SortKey, (a: ListOverview, b: ListOverview) => number> = {
      title: (a, b) => a.title.localeCompare(b.title, locale),
      progress: (a, b) => listProgress(a).percent - listProgress(b).percent,
      due: (a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'),
      updated: (a, b) => a.updatedAt.localeCompare(b.updatedAt),
    };
    return [...filtered].sort((a, b) => cmp[sort.key](a, b) * sort.dir);
  }, [rows, quick, sort, locale]);

  function toggleSort(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === 1 ? -1 : 1 }
        : { key, dir: 1 },
    );
  }
  function toggleRow(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleTask(listId: string, taskId: string) {
    startTransition(async () => {
      flipTask({ listId, taskId });
      await toggleTaskDoneAction(taskId);
      router.refresh();
    });
  }

  const quickFilters: { key: Quick; label: string }[] = [
    { key: 'all', label: t('filterAll') },
    { key: 'overdue', label: tOverview('overdue') },
    { key: 'shared', label: tOverview('shared') },
    { key: 'recurring', label: tOverview('recurring') },
  ];

  const header = (key: SortKey, label: string, className?: string) => (
    <th
      scope="col"
      className={cn('px-3 py-2 text-left font-semibold', className)}
    >
      <button
        type="button"
        onClick={() => toggleSort(key)}
        aria-sort={
          sort.key === key
            ? sort.dir === 1
              ? 'ascending'
              : 'descending'
            : undefined
        }
        className={cn(
          'inline-flex items-center gap-1 rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          sort.key === key ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {label}
        {sort.key === key ? (
          <span aria-hidden="true">{sort.dir === 1 ? '↑' : '↓'}</span>
        ) : null}
      </button>
    </th>
  );

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2">
        <div
          role="group"
          aria-label={t('quickFilters')}
          className="flex flex-wrap gap-1"
        >
          {quickFilters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              aria-pressed={quick === filter.key}
              onClick={() => setQuick(filter.key)}
              className={cn(
                'rounded-md border px-2.5 py-1 text-xs font-medium',
                quick === filter.key
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground',
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-muted-foreground">
          {t('showing', { count: visible.length, total: rows.length })}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-muted/60 text-xs">
            <tr>
              <th scope="col" className="w-8 px-2 py-2">
                <span className="sr-only">{t('expand')}</span>
              </th>
              {header('title', t('colList'))}
              <th
                scope="col"
                className="px-3 py-2 text-left font-semibold text-muted-foreground"
              >
                {t('colCategory')}
              </th>
              {header('progress', t('colProgress'), 'hidden md:table-cell')}
              {header('due', t('colDue'))}
              <th
                scope="col"
                className="hidden px-3 py-2 text-left font-semibold text-muted-foreground lg:table-cell"
              >
                {t('colPeople')}
              </th>
              {header('updated', t('colUpdated'), 'hidden xl:table-cell')}
              <th scope="col" className="w-10 px-2 py-2">
                <span className="sr-only">{t('open')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  {tOverview('emptyFiltered')}
                </td>
              </tr>
            ) : null}
            {visible.map((list) => {
              const progress = listProgress(list);
              const status = dueStatus(list.dueDate);
              const open = expanded.has(list.id);
              return (
                <LedgerRow
                  key={list.id}
                  list={list}
                  open={open}
                  onToggle={() => toggleRow(list.id)}
                  onToggleTask={(taskId) => toggleTask(list.id, taskId)}
                  pending={isPending}
                  cells={
                    <>
                      <td className="px-3 py-2">
                        <span className="font-semibold">{list.title}</span>
                        {list.templateId || list.collaborators.length > 0 ? (
                          <span className="block text-xs text-muted-foreground">
                            {[
                              list.templateId
                                ? `${tOverview('recurring')} · ${formatOccurrenceDate(list.createdAt, locale)}`
                                : null,
                              list.collaborators.length > 0
                                ? tOverview('shared')
                                : null,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        ) : null}
                        <RestoreListButton list={list} className="mt-1" />
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            aria-hidden="true"
                            className="h-2 w-2 rounded-full"
                            style={{
                              background: list.myCategory
                                ? categoryColor(list.myCategory.id)
                                : 'hsl(var(--border))',
                            }}
                          />
                          {list.myCategory?.name ?? tNav('uncategorized')}
                        </span>
                      </td>
                      <td className="hidden px-3 py-2 md:table-cell">
                        <span className="flex items-center gap-2">
                          <ProgressBar progress={progress} className="w-24" />
                          <span className="w-10 tabular-nums text-muted-foreground">
                            {progress.done}/{progress.total}
                          </span>
                        </span>
                      </td>
                      <td
                        className={cn(
                          'px-3 py-2 tabular-nums',
                          status === 'overdue'
                            ? 'font-semibold text-destructive'
                            : status === 'today' || status === 'soon'
                              ? 'font-semibold text-foreground'
                              : 'text-muted-foreground',
                        )}
                      >
                        {list.dueDate
                          ? formatDueDate(list.dueDate, locale)
                          : '—'}
                      </td>
                      <td className="hidden px-3 py-2 lg:table-cell">
                        <AvatarStack people={list.collaborators} />
                        {list.collaborators.length === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : null}
                      </td>
                      <td className="hidden px-3 py-2 text-muted-foreground xl:table-cell">
                        {formatRelativeDay(list.updatedAt, locale)}
                      </td>
                    </>
                  }
                />
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t px-4 py-2 text-xs text-muted-foreground">
        {t('footerHint')} · {tTasks('title')}:{' '}
        {rows.reduce((sum, l) => sum + l.tasks.length, 0)}
      </p>
    </div>
  );
}

function LedgerRow({
  list,
  open,
  onToggle,
  onToggleTask,
  pending,
  cells,
}: {
  list: ListOverview;
  open: boolean;
  onToggle: () => void;
  onToggleTask: (taskId: string) => void;
  pending: boolean;
  cells: React.ReactNode;
}) {
  const t = useTranslations('Ledger');
  const tTasks = useTranslations('Tasks');
  const createTask = createTaskAction.bind(null, list.id);
  const router = useRouter();

  return (
    <>
      <tr
        className={cn(
          'border-t transition-colors hover:bg-muted/50',
          open && 'bg-accent/60',
        )}
      >
        <td className="px-2 py-2">
          <span className="flex items-center justify-center gap-1.5">
            <ListSelectionCheckbox list={list} className="shrink-0" />
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={open}
              aria-label={open ? t('collapse') : t('expand')}
              className="rounded-sm p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronRight
                className={cn(
                  'h-4 w-4 transition-transform',
                  open && 'rotate-90',
                )}
                aria-hidden="true"
              />
            </button>
          </span>
        </td>
        {cells}
        <td className="px-2 py-2 text-center">
          <Link
            href={`/lists/${list.id}`}
            aria-label={t('open')}
            className="inline-flex rounded-sm p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </Link>
        </td>
      </tr>
      {open ? (
        <tr className="bg-accent/40">
          <td colSpan={8} className="px-4 pb-4 pt-1 md:pl-12">
            <div className="overflow-hidden rounded-md border bg-card">
              <table className="w-full">
                <thead className="text-xs text-muted-foreground">
                  <tr className="border-b">
                    <th scope="col" className="w-8 px-3 py-1.5" />
                    <th
                      scope="col"
                      className="px-3 py-1.5 text-left font-medium"
                    >
                      {t('colTask')}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-1.5 text-left font-medium"
                    >
                      {t('colDue')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {list.tasks.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-3 py-3 text-muted-foreground"
                      >
                        {tTasks('emptyState')}
                      </td>
                    </tr>
                  ) : null}
                  {list.tasks.map((task) => (
                    <tr key={task.id} className="border-b last:border-b-0">
                      <td className="px-3 py-1.5">
                        <Checkbox
                          checked={task.done}
                          disabled={pending}
                          aria-label={task.title}
                          onCheckedChange={() => onToggleTask(task.id)}
                        />
                      </td>
                      <td
                        className={cn(
                          'px-3 py-1.5',
                          task.done && 'text-muted-foreground line-through',
                        )}
                      >
                        {task.title}
                      </td>
                      <td className="px-3 py-1.5 tabular-nums text-muted-foreground">
                        {task.dueDate ? task.dueDate.slice(0, 10) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <form
                action={async (formData) => {
                  await createTask(formData);
                  router.refresh();
                }}
                className="flex gap-2 border-t p-2"
              >
                <Input
                  name="title"
                  placeholder={tTasks('createPlaceholder')}
                  required
                  className="max-w-md"
                />
                <Button type="submit" size="sm">
                  {tTasks('addButton')}
                </Button>
                <Link
                  href={`/lists/${list.id}`}
                  className="ml-auto self-center text-xs text-primary hover:underline"
                >
                  {t('openFull')} ↗
                </Link>
              </form>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
