import { useTranslations } from 'next-intl';
import { PendingInviteRow } from '@features/list-sharing/PendingInviteRow';
import type { ListsPageProps } from '../types';
import { BoardColumns } from './BoardColumns';

export function ListsPage({ nav, filter }: ListsPageProps) {
  const t = useTranslations('Board');

  return (
    <BoardColumns
      categories={nav.categories}
      lists={nav.lists}
      onlyCategoryId={filter.categoryId}
      onlyUncategorized={filter.uncategorizedOnly}
      trailing={
        nav.pendingInvites.length > 0 ? (
          <section
            aria-label={t('invites')}
            className="flex w-64 shrink-0 flex-col gap-2.5 rounded-xl border-2 border-dashed p-2"
          >
            <header className="flex items-center gap-2 px-1 text-sm font-bold">
              <span className="truncate">{t('invites')}</span>
              <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                {nav.pendingInvites.length}
              </span>
            </header>
            <ul className="flex flex-col gap-2">
              {nav.pendingInvites.map((invite) => (
                <PendingInviteRow key={invite.id} invite={invite} />
              ))}
            </ul>
          </section>
        ) : null
      }
    />
  );
}
