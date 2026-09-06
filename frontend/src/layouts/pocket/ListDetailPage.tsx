import { useLocale, useTranslations } from 'next-intl';
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
import { BackLink, Group } from './BackLink';
import { ProgressBar } from '../shared/ProgressBar';
import { AvatarStack } from '../shared/Avatar';
import { dueStatus, formatDueDate, taskProgress } from '../shared/list-stats';

export function ListDetailPage({ nav, list }: ListDetailPageProps) {
  const tNav = useTranslations('Nav');
  const tOverview = useTranslations('Overview');
  const tTasks = useTranslations('Tasks');
  const tComments = useTranslations('Comments');
  const tSharing = useTranslations('Sharing');
  const locale = useLocale();
  const progress = taskProgress(list.tasks);
  const status = dueStatus(list.dueDate);

  return (
    <div className="flex flex-col gap-5">
      <BackLink href="/" label={tNav('lists')} />
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold text-muted-foreground">
          {list.myCategory?.name ?? tNav('uncategorized')}
          {list.collaborators.length > 0 ? (
            <>
              {' · '}
              {tOverview('shared')}{' '}
              <AvatarStack
                people={list.collaborators}
                className="ml-1 align-middle"
              />
            </>
          ) : null}
        </span>
        <ListTitleForm
          list={list}
          inputClassName="text-2xl font-extrabold tracking-tight"
        />
        <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground">
          <span className="tabular-nums">
            {progress.done}/{progress.total}
          </span>
          <ProgressBar progress={progress} className="h-2" />
          <span className="tabular-nums">{progress.percent}%</span>
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs font-bold">
          <span
            className={
              status === 'overdue'
                ? 'rounded-full bg-destructive/10 px-2.5 py-1 text-destructive'
                : 'rounded-full bg-secondary px-2.5 py-1'
            }
          >
            {list.dueDate
              ? `📅 ${status === 'overdue' ? tOverview('overdue') + ' · ' : ''}${formatDueDate(list.dueDate, locale)}`
              : tOverview('noDueDate')}
          </span>
          {list.comments.length > 0 ? (
            <span className="rounded-full bg-secondary px-2.5 py-1">
              💬 {list.comments.length}
            </span>
          ) : null}
        </div>
      </div>

      <Group title={tTasks('title')}>
        <TaskSection
          list={list}
          showHeading={false}
          listClassName="task-cards -mx-2 gap-1"
        />
      </Group>

      <Group>
        <div className="flex flex-col gap-3 text-sm">
          <ListDueDateForm list={list} />
          <ListMetaControls
            list={list}
            categories={nav.categories}
            googleCalendarConnected={nav.user.googleCalendarConnected}
          />
        </div>
      </Group>

      <Group title={tComments('title')}>
        <ListCommentsSection list={list} showHeading={false} />
      </Group>

      <Group title={tSharing('title')}>
        <ListSharingSection
          list={list}
          myUserId={nav.user.id}
          showHeading={false}
        />
      </Group>

      <DeleteListControl list={list} className="[&_button]:w-full" />
    </div>
  );
}
