import { useTranslations } from 'next-intl';
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
import { TuiHeading } from './Shell';
import { bar } from './ListsPage';
import { taskProgress } from '../shared/list-stats';

export function ListDetailPage({ nav, list }: ListDetailPageProps) {
  const t = useTranslations('Terminal');
  const tNav = useTranslations('Nav');
  const tTasks = useTranslations('Tasks');
  const tComments = useTranslations('Comments');
  const tSharing = useTranslations('Sharing');
  const progress = taskProgress(list.tasks);

  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <div>
        <div className="flex items-baseline gap-2">
          <span className="font-bold text-muted-foreground">#</span>
          <ListTitleForm
            list={list}
            className="flex-1"
            inputClassName="h-8 border-0 bg-transparent px-0 font-[inherit] text-base font-bold shadow-none focus-visible:ring-0"
          />
        </div>
        <p className="text-muted-foreground">
          @{(list.myCategory?.name ?? tNav('uncategorized')).toLowerCase()} ·{' '}
          {t('due')}{' '}
          <b className="font-semibold text-foreground">
            {list.dueDate?.slice(0, 10) ?? '—'}
          </b>{' '}
          · {t('owner')}{' '}
          <b className="font-semibold text-foreground">
            {list.isOwner ? t('you') : t('other')}
          </b>
          {list.collaborators.length > 0 ? (
            <>
              {' '}
              · {t('with')}{' '}
              <b className="font-semibold text-foreground">
                {list.collaborators
                  .map((c) => (c.name ?? c.email).split(' ')[0].toLowerCase())
                  .join(', ')}
              </b>
            </>
          ) : null}
          {list.templateId ? ` · ${t('recurring')}` : ''}
        </p>
        <p>
          <span className="text-primary">{bar(progress.percent, 20)}</span>{' '}
          <span className="text-muted-foreground">
            {progress.percent}% · {progress.done}/{progress.total}
          </span>
        </p>
      </div>

      <section>
        <TuiHeading>
          {tTasks('title').toLowerCase()} ({list.tasks.length})
        </TuiHeading>
        <TaskSection
          list={list}
          showHeading={false}
          className="mt-1"
          listClassName="tui-tasks gap-0"
        />
      </section>

      <section className="flex flex-col gap-2">
        <TuiHeading>{t('meta')}</TuiHeading>
        <ListDueDateForm list={list} />
        <ListMetaControls
          list={list}
          categories={nav.categories}
          googleCalendarConnected={nav.user.googleCalendarConnected}
        />
      </section>

      <section>
        <TuiHeading>
          {tComments('title').toLowerCase()} ({list.comments.length})
        </TuiHeading>
        <ListCommentsSection list={list} showHeading={false} className="mt-1" />
      </section>

      <section>
        <TuiHeading>{tSharing('title').toLowerCase()}</TuiHeading>
        <ListSharingSection
          list={list}
          myUserId={nav.user.id}
          showHeading={false}
          className="mt-1"
        />
      </section>

      <DeleteListControl list={list} />
    </div>
  );
}
