import { useTranslations } from 'next-intl';
import { PendingInviteRow } from '@features/list-sharing/PendingInviteRow';
import { ListSelectionBar, ListSelectionToggle } from '@features/todos-list';
import type { ListsPageProps } from '../types';
import { BoardColumns } from './BoardColumns';
import { ArchiveFilterLink } from '../shared/ArchiveFilterLink';
import { archivedLists } from '../shared/category-filter';

// The columns are this layout's category filter, so the archive is the only
// filter needing a control of its own. BoardColumns gets already-filtered
// `lists`; onlyCategoryId/onlyUncategorized decide which columns render.
export function ListsPage({ nav, lists, filter }: ListsPageProps) {
  const t = useTranslations('Board');

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 px-4 pt-4 md:px-6">
        <ArchiveFilterLink
          filter={filter}
          count={archivedLists(nav.lists).length}
          className="rounded-full border px-3 py-1 text-xs font-bold text-muted-foreground hover:text-foreground"
          activeClassName="border-primary bg-primary text-primary-foreground hover:text-primary-foreground"
          countClassName="tabular-nums opacity-70"
        />
        <ListSelectionToggle />
        <ListSelectionBar />
      </div>
      <BoardColumns
        categories={nav.categories}
        lists={lists}
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
    </div>
  );
}
