import { useLocale, useTranslations } from 'next-intl';
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
import { AvatarStack } from '../shared/Avatar';
import { ProgressBar } from '../shared/ProgressBar';
import { formatDueDate, taskProgress } from '../shared/list-stats';

// One record, in full: a field table up top, then the task table, then the
// long-form sections (comments, sharing) side by side.
export function ListDetailPage({ nav, list }: ListDetailPageProps) {
  const t = useTranslations('Ledger');
  const tNav = useTranslations('Nav');
  const tOverview = useTranslations('Overview');
  const locale = useLocale();
  const progress = taskProgress(list.tasks);

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 border-b px-4 py-2 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          {tNav('lists')}
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          href={
            list.myCategory
              ? `/?categoryId=${list.myCategory.id}`
              : '/?uncategorized=true'
          }
          className="hover:text-foreground"
        >
          {list.myCategory?.name ?? tNav('uncategorized')}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="truncate text-foreground">{list.title}</span>
      </div>

      <div className="grid gap-6 p-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <section className="overflow-hidden rounded-md border bg-card">
            <Field label={t('fieldTitle')}>
              <ListTitleForm
                list={list}
                inputClassName="text-base font-semibold"
              />
            </Field>
            <Field label={t('colDue')}>
              <ListDueDateForm list={list} />
              {list.dueDate ? (
                <span className="text-xs text-muted-foreground">
                  {formatDueDate(list.dueDate, locale, {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </span>
              ) : null}
            </Field>
            <Field label={t('colProgress')}>
              <span className="flex items-center gap-3">
                <ProgressBar progress={progress} className="max-w-xs" />
                <span className="tabular-nums text-muted-foreground">
                  {tOverview('doneOf', {
                    done: progress.done,
                    total: progress.total,
                  })}
                </span>
              </span>
            </Field>
            <Field label={t('colPeople')}>
              <span className="flex items-center gap-2">
                <AvatarStack people={list.collaborators} />
                <span className="text-muted-foreground">
                  {list.collaborators.length === 0
                    ? tOverview('onlyYou')
                    : list.collaborators
                        .map((c) => c.name ?? c.email)
                        .join(', ')}
                </span>
              </span>
            </Field>
            <Field label={t('fieldMeta')}>
              <ListMetaControls
                list={list}
                categories={nav.categories}
                googleCalendarConnected={nav.user.googleCalendarConnected}
              />
            </Field>
          </section>

          <section className="rounded-md border bg-card p-4">
            <TaskSection
              list={list}
              headingClassName="text-xs font-semibold uppercase tracking-wider"
              listClassName="ledger-tasks gap-0 divide-y"
            />
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section className="rounded-md border bg-card p-4">
            <ListCommentsSection
              list={list}
              headingClassName="text-xs font-semibold uppercase tracking-wider"
            />
          </section>
          <section className="rounded-md border bg-card p-4">
            <ListSharingSection
              list={list}
              myUserId={nav.user.id}
              headingClassName="text-xs font-semibold uppercase tracking-wider"
            />
          </section>
          <DeleteListControl list={list} className="self-start" />
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[9rem_1fr] items-center gap-3 border-b px-4 py-2 last:border-b-0">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
