import { useTranslations } from 'next-intl';
import { Link } from '@shared/lib/i18n/navigation';
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
import { ListsColumn } from './ListsColumn';
import { ProgressBar } from '../shared/ProgressBar';
import { AvatarStack } from '../shared/Avatar';
import { taskProgress } from '../shared/list-stats';
import { activeLists } from '../shared/category-filter';

export function ListDetailPage({ nav, list }: ListDetailPageProps) {
  const t = useTranslations('Nav');
  const tOverview = useTranslations('Overview');
  const progress = taskProgress(list.tasks);

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <ListsColumn
        nav={nav}
        lists={activeLists(nav.lists, list.id)}
        activeListId={list.id}
      />
      <article className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-1.5 border-b px-6 py-2.5 text-xs text-muted-foreground">
          <Link
            href={
              list.myCategory
                ? `/?categoryId=${list.myCategory.id}`
                : '/?uncategorized=true'
            }
            className="hover:text-foreground"
          >
            {list.myCategory?.name ?? t('uncategorized')}
          </Link>
          <span aria-hidden="true">›</span>
          <span className="truncate text-foreground">{list.title}</span>
        </div>
        <div className="flex max-w-3xl flex-col gap-6 p-6">
          <ListTitleForm list={list} />
          <dl className="grid grid-cols-[7rem_1fr] items-center gap-x-3 gap-y-3 text-sm">
            <dt className="text-muted-foreground">{tOverview('due')}</dt>
            <dd>
              <ListDueDateForm list={list} />
            </dd>
            <dt className="text-muted-foreground">{tOverview('progress')}</dt>
            <dd className="flex items-center gap-3">
              <ProgressBar progress={progress} className="w-40" />
              <span className="tabular-nums text-muted-foreground">
                {tOverview('doneOf', {
                  done: progress.done,
                  total: progress.total,
                })}
              </span>
            </dd>
            <dt className="text-muted-foreground">{tOverview('people')}</dt>
            <dd className="flex items-center gap-2 text-muted-foreground">
              <AvatarStack people={list.collaborators} />
              {list.collaborators.length === 0
                ? tOverview('onlyYou')
                : list.collaborators.map((c) => c.name ?? c.email).join(', ')}
            </dd>
          </dl>
          <ListMetaControls
            list={list}
            categories={nav.categories}
            googleCalendarConnected={nav.user.googleCalendarConnected}
          />
          <TaskSection
            list={list}
            headingClassName="text-[11px] uppercase tracking-wider"
          />
          <ListCommentsSection
            list={list}
            headingClassName="text-[11px] uppercase tracking-wider"
          />
          <ListSharingSection
            list={list}
            myUserId={nav.user.id}
            headingClassName="text-[11px] uppercase tracking-wider"
          />
          <DeleteListControl list={list} className="border-t pt-6" />
        </div>
      </article>
    </div>
  );
}
