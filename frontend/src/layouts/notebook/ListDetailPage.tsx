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
import { Spread } from './Spread';
import { Contents } from './Contents';
import { Sticky } from './Sticky';
import { formatDueDate, taskProgress } from '../shared/list-stats';

export function ListDetailPage({ nav, list }: ListDetailPageProps) {
  const t = useTranslations('Notebook');
  const tOverview = useTranslations('Overview');
  const tNav = useTranslations('Nav');
  const locale = useLocale();
  const progress = taskProgress(list.tasks);

  return (
    <Spread
      tabs={nav.categories}
      activeTabId={list.myCategory?.id ?? null}
      tabsLabel={tNav('categories')}
      left={
        <Contents
          lists={nav.lists}
          activeListId={list.id}
          emptyText={tOverview('emptyFiltered')}
        />
      }
      right={
        <>
          {list.collaborators.length > 0 ? (
            <span className="nb-hand absolute right-10 top-2 rotate-3 bg-secondary px-3 py-0.5 text-base shadow-[0_2px_4px_rgba(0,0,0,0.15)]">
              📎{' '}
              {t('sharedWith', {
                names: list.collaborators
                  .map((c) => c.name ?? c.email)
                  .join(', '),
              })}
            </span>
          ) : null}
          <ListTitleForm
            list={list}
            className="items-baseline"
            inputClassName="nb-hand h-10 border-0 border-b border-dashed bg-transparent px-0 text-4xl font-semibold shadow-none focus-visible:ring-0"
          />
          <p className="nb-hand text-lg leading-8 text-muted-foreground">
            {list.myCategory?.name ?? tNav('uncategorized')}
            {' · '}
            {list.dueDate
              ? `${tOverview('due').toLowerCase()} ${formatDueDate(list.dueDate, locale)}`
              : tOverview('noDueDate').toLowerCase()}
            {' · '}
            {tOverview('doneOf', {
              done: progress.done,
              total: progress.total,
            })}
          </p>
          <TaskSection
            list={list}
            showHeading={false}
            className="mt-2"
            listClassName="gap-0"
          />
          <div className="mt-6 flex flex-col gap-4 text-sm">
            <ListDueDateForm list={list} />
            <ListMetaControls
              list={list}
              categories={nav.categories}
              googleCalendarConnected={nav.user.googleCalendarConnected}
            />
          </div>
          <Sticky className="mt-10">
            <ListCommentsSection
              list={list}
              headingClassName="nb-hand text-xl text-accent-foreground"
            />
          </Sticky>
          <div className="mt-10 flex flex-col gap-6 text-sm">
            <ListSharingSection list={list} myUserId={nav.user.id} />
            <DeleteListControl list={list} />
          </div>
        </>
      }
    />
  );
}
