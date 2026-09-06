import { useTranslations } from 'next-intl';
import { PendingInvites } from '@features/list-sharing';
import type { ListsPageProps } from '../types';
import { ListsColumn } from './ListsColumn';
import { dueStatus, listProgress, todayIso } from '../shared/list-stats';

export function ListsPage({ nav, lists, filter }: ListsPageProps) {
  const t = useTranslations('Nav');
  const tOverview = useTranslations('Overview');
  const today = todayIso();

  let overdue = 0;
  let dueSoon = 0;
  let open = 0;
  for (const list of nav.lists) {
    const status = dueStatus(list.dueDate, today);
    if (status === 'overdue') overdue += 1;
    if (status === 'today' || status === 'soon') dueSoon += 1;
    const progress = listProgress(list);
    open += progress.total - progress.done;
  }

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <ListsColumn nav={nav} lists={lists} filter={filter} />
      <section className="flex flex-1 flex-col gap-8 p-6 md:p-8">
        <PendingInvites invites={nav.pendingInvites} />
        <div className="grid grid-cols-3 gap-3">
          <Stat
            label={tOverview('overdue')}
            value={overdue}
            danger={overdue > 0}
          />
          <Stat label={tOverview('dueThisWeek')} value={dueSoon} />
          <Stat label={tOverview('openTasks')} value={open} />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm font-medium">{t('selectList')}</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            {t('selectListHint')}
          </p>
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  danger,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={
          danger
            ? 'text-2xl font-semibold tabular-nums text-destructive'
            : 'text-2xl font-semibold tabular-nums'
        }
      >
        {value}
      </div>
    </div>
  );
}
