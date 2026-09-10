'use client';

import { useOptimistic, useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@shared/lib/i18n/navigation';
import { cn } from '@shared/lib/utils';
import { Button } from '@ui/components/button';
import { Input } from '@ui/components/input';
import type { Category } from '@features/categories';
import {
  assignCategoryAction,
  unassignCategoryAction,
} from '@features/todo-list/actions';
import { createListInCategoryAction } from '@features/todos-list';
import type { ListOverview } from '../types';
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

interface BoardColumnsProps {
  categories: Category[];
  lists: ListOverview[];
  // When the overview is filtered, only that column is shown.
  onlyCategoryId?: string | null;
  onlyUncategorized?: boolean;
  activeListId?: string;
  // Extra column rendered after the category columns (pending invites).
  trailing?: React.ReactNode;
}

const UNCATEGORIZED = '__uncategorized__';

// Categories as columns, lists as cards. Native HTML5 drag-and-drop (no
// library): dropping a card on a column re-files the list, optimistically on
// the client and via the per-user assignment mutation on the server.
export function BoardColumns({
  categories,
  lists,
  onlyCategoryId,
  onlyUncategorized,
  activeListId,
  trailing,
}: BoardColumnsProps) {
  const t = useTranslations('Board');
  const tNav = useTranslations('Nav');
  const [isPending, startTransition] = useTransition();
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [placed, movePlaced] = useOptimistic(
    lists,
    (state, move: { listId: string; categoryId: string | null }) =>
      state.map((list) =>
        list.id === move.listId
          ? {
              ...list,
              myCategory: move.categoryId
                ? {
                    id: move.categoryId,
                    name:
                      categories.find((c) => c.id === move.categoryId)?.name ??
                      '',
                  }
                : null,
            }
          : list,
      ),
  );

  const columns: { key: string; id: string | null; name: string }[] = [
    ...categories.map((c) => ({ key: c.id, id: c.id, name: c.name })),
    { key: UNCATEGORIZED, id: null, name: tNav('uncategorized') },
  ].filter((column) => {
    if (onlyUncategorized) return column.id === null;
    if (onlyCategoryId) return column.id === onlyCategoryId;
    return true;
  });

  function drop(columnId: string | null, listId: string) {
    const list = placed.find((l) => l.id === listId);
    if (!list || (list.myCategory?.id ?? null) === columnId) return;
    startTransition(async () => {
      movePlaced({ listId, categoryId: columnId });
      if (columnId) await assignCategoryAction(listId, columnId);
      else await unassignCategoryAction(listId);
    });
  }

  return (
    <div className="flex flex-1 gap-4 overflow-x-auto p-4 md:p-6">
      {columns.map((column) => {
        const cards = sortByDue(
          placed.filter((list) => (list.myCategory?.id ?? null) === column.id),
        );
        const over = dragOver === column.key;
        return (
          <section
            key={column.key}
            aria-label={column.name}
            onDragOver={(event) => {
              event.preventDefault();
              if (dragOver !== column.key) setDragOver(column.key);
            }}
            onDragLeave={() =>
              setDragOver((k) => (k === column.key ? null : k))
            }
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(null);
              const listId = event.dataTransfer.getData('text/list-id');
              if (listId) drop(column.id, listId);
            }}
            className={cn(
              'flex w-64 shrink-0 flex-col gap-2.5 rounded-xl p-1 transition-colors',
              over && 'bg-primary/10 ring-2 ring-primary/40',
            )}
          >
            <header className="flex items-center gap-2 px-1 pt-1 text-sm font-bold">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  background: column.id
                    ? categoryColor(column.id)
                    : 'hsl(var(--border))',
                }}
              />
              <span className="truncate">{column.name}</span>
              <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                {cards.length}
              </span>
            </header>

            {cards.map((list) => (
              <ListCard
                key={list.id}
                list={list}
                active={list.id === activeListId}
                disabled={isPending}
              />
            ))}

            <AddListForm categoryId={column.id} />
            {over ? (
              <p className="px-2 text-center text-xs font-semibold text-primary">
                {t('dropHint')}
              </p>
            ) : null}
          </section>
        );
      })}
      {trailing ? <div className="contents">{trailing}</div> : null}
    </div>
  );
}

function ListCard({
  list,
  active,
  disabled,
}: {
  list: ListOverview;
  active: boolean;
  disabled: boolean;
}) {
  const t = useTranslations('Overview');
  const locale = useLocale();
  const progress = listProgress(list);
  const status = dueStatus(list.dueDate);
  const preview = list.tasks.slice(0, 3);
  const rest = list.tasks.length - preview.length;

  return (
    <article
      draggable={!disabled}
      onDragStart={(event) => {
        event.dataTransfer.setData('text/list-id', list.id);
        event.dataTransfer.effectAllowed = 'move';
      }}
      className={cn(
        'flex cursor-grab flex-col gap-2 rounded-xl border bg-card p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing',
        active && 'border-primary ring-2 ring-primary/30',
        disabled && 'opacity-60',
      )}
    >
      <Link
        href={`/lists/${list.id}`}
        className="text-sm font-bold leading-tight tracking-tight hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {list.title}
        {list.templateId ? (
          <span
            className="ml-1.5 text-xs font-semibold text-muted-foreground"
            title={t('recurring')}
          >
            ↻ {formatOccurrenceDate(list.createdAt, locale)}
          </span>
        ) : null}
      </Link>
      {preview.length > 0 ? (
        <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
          {preview.map((task) => (
            <li key={task.id} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className={cn(
                  'inline-block h-3 w-3 shrink-0 rounded-full border',
                  task.done && 'border-primary bg-primary',
                )}
              />
              <span className={cn('truncate', task.done && 'line-through')}>
                {task.title}
              </span>
            </li>
          ))}
          {rest > 0 ? (
            <li className="pl-[18px]">{t('moreTasks', { count: rest })}</li>
          ) : null}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">{t('noTasks')}</p>
      )}
      <ProgressBar progress={progress} />
      <footer className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
        <span className={cn(status === 'overdue' && 'text-destructive')}>
          {progress.done}/{progress.total}
          {list.dueDate
            ? ` · ${status === 'overdue' ? t('overdue') : formatDueDate(list.dueDate, locale)}`
            : ''}
        </span>
        <AvatarStack people={list.collaborators} max={2} />
      </footer>
    </article>
  );
}

function AddListForm({ categoryId }: { categoryId: string | null }) {
  const t = useTranslations('Board');
  const tLists = useTranslations('Lists');
  const [open, setOpen] = useState(false);
  const action = createListInCategoryAction.bind(null, categoryId);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-dashed px-3 py-2 text-left text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        + {t('addList')}
      </button>
    );
  }

  return (
    <form
      action={async (formData) => {
        await action(formData);
        setOpen(false);
      }}
      className="flex flex-col gap-2 rounded-xl border bg-card p-2"
    >
      <Input
        name="title"
        placeholder={tLists('createPlaceholder')}
        required
        autoFocus
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm">
          {tLists('createButton')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setOpen(false)}
        >
          {t('cancel')}
        </Button>
      </div>
    </form>
  );
}
