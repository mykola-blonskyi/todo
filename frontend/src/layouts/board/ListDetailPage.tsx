import { useLocale, useTranslations } from 'next-intl';
import { Badge } from '@ui/components/badge';
import {
  ListTitleForm,
  ListDueDateForm,
  ListMetaControls,
  TaskSection,
  ListCommentsSection,
  ListSharingSection,
  DeleteListControl,
} from '@features/todo-list';
import type { ListDetailPageProps } from '../types';
import { BoardColumns } from './BoardColumns';
import { Drawer } from './Drawer';
import { ProgressBar } from '../shared/ProgressBar';
import { AvatarStack } from '../shared/Avatar';
import {
  categoryColor,
  dueStatus,
  formatDueDate,
  taskProgress,
} from '../shared/list-stats';

export function ListDetailPage({ nav, list }: ListDetailPageProps) {
  const t = useTranslations('Board');
  const tNav = useTranslations('Nav');
  const tOverview = useTranslations('Overview');
  const locale = useLocale();
  const progress = taskProgress(list.tasks);
  const status = dueStatus(list.dueDate);

  return (
    <>
      <BoardColumns
        categories={nav.categories}
        lists={nav.lists}
        activeListId={list.id}
      />
      <Drawer
        backHref="/"
        closeLabel={t('close')}
        crumb={
          <>
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full"
              style={{
                background: list.myCategory
                  ? categoryColor(list.myCategory.id)
                  : 'hsl(var(--border))',
              }}
            />
            <span>{list.myCategory?.name ?? tNav('uncategorized')}</span>
            <span aria-hidden="true">/</span>
            <span className="truncate text-foreground">{list.title}</span>
          </>
        }
      >
        <ListTitleForm
          list={list}
          inputClassName="text-2xl font-extrabold tracking-tight"
        />
        <div className="flex flex-wrap items-center gap-2">
          {list.dueDate ? (
            <Badge
              variant={status === 'overdue' ? 'default' : 'secondary'}
              className="rounded-full"
            >
              {status === 'overdue' ? tOverview('overdue') : tOverview('due')} ·{' '}
              {formatDueDate(list.dueDate, locale)}
            </Badge>
          ) : (
            <Badge variant="secondary" className="rounded-full">
              {tOverview('noDueDate')}
            </Badge>
          )}
          <Badge variant="secondary" className="rounded-full">
            {progress.done}/{progress.total} · {progress.percent}%
          </Badge>
          {list.collaborators.length > 0 ? (
            <span className="ml-auto flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <AvatarStack people={list.collaborators} />
            </span>
          ) : null}
        </div>
        <ProgressBar progress={progress} className="h-2" />
        <ListDueDateForm list={list} />
        <ListMetaControls
          list={list}
          categories={nav.categories}
          googleCalendarConnected={nav.user.googleCalendarConnected}
        />
        <TaskSection
          list={list}
          headingClassName="text-sm font-bold text-foreground"
        />
        <ListSharingSection
          list={list}
          myUserId={nav.user.id}
          headingClassName="text-sm font-bold text-foreground"
        />
        <ListCommentsSection
          list={list}
          headingClassName="text-sm font-bold text-foreground"
        />
        <DeleteListControl list={list} className="border-t pt-5" />
      </Drawer>
    </>
  );
}
