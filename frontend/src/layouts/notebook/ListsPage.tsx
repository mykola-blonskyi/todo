import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@shared/lib/i18n/navigation';
import { PendingInviteRow } from '@features/list-sharing/PendingInviteRow';
import type { ListsPageProps } from '../types';
import { Spread } from './Spread';
import { Contents } from './Contents';
import { Sticky } from './Sticky';
import { ArchiveFilterLink } from '../shared/ArchiveFilterLink';
import { activeLists, archivedLists } from '../shared/category-filter';
import { dueStatus, formatDueDate, sortByDue } from '../shared/list-stats';

export function ListsPage({ nav, lists, filter }: ListsPageProps) {
  const t = useTranslations('Notebook');
  const tOverview = useTranslations('Overview');
  const tNav = useTranslations('Nav');
  const tTemplates = useTranslations('ListTemplates');
  const locale = useLocale();

  const heading = filter.archivedOnly
    ? tNav('archive')
    : filter.uncategorizedOnly
      ? tNav('uncategorized')
      : filter.categoryId
        ? nav.categories.find((c) => c.id === filter.categoryId)?.name
        : undefined;

  const upcoming = sortByDue(activeLists(nav.lists)).filter((list) => {
    const status = dueStatus(list.dueDate);
    return status === 'overdue' || status === 'today' || status === 'soon';
  });

  return (
    <Spread
      tabs={nav.categories}
      activeTabId={filter.categoryId}
      tabsLabel={tNav('categories')}
      left={
        <>
          <Contents
            lists={lists}
            heading={heading}
            emptyText={tOverview('emptyFiltered')}
          />
          <ArchiveFilterLink
            filter={filter}
            count={archivedLists(nav.lists).length}
            className="nb-hand mt-6 inline-block text-lg text-muted-foreground hover:underline"
            activeClassName="text-primary"
          />
        </>
      }
      right={
        <>
          <h2 className="nb-hand text-4xl font-semibold leading-8">
            {t('thisWeek')}
          </h2>
          <ul className="mt-8">
            {upcoming.length === 0 ? (
              <li className="italic leading-8 text-muted-foreground">
                {t('nothingDue')}
              </li>
            ) : null}
            {upcoming.map((list) => {
              const status = dueStatus(list.dueDate);
              return (
                <li
                  key={list.id}
                  className="flex items-baseline gap-3 leading-8"
                >
                  <span
                    className={
                      status === 'overdue'
                        ? 'nb-hand w-28 shrink-0 text-lg text-destructive'
                        : 'nb-hand w-28 shrink-0 text-lg text-muted-foreground'
                    }
                  >
                    {status === 'overdue'
                      ? tOverview('overdue')
                      : formatDueDate(list.dueDate!, locale)}
                  </span>
                  <Link href={`/lists/${list.id}`} className="hover:underline">
                    {list.title}
                  </Link>
                </li>
              );
            })}
          </ul>

          <h3 className="nb-hand mt-8 text-2xl leading-8 text-muted-foreground">
            {tTemplates('title')}
          </h3>
          <ul>
            {nav.templates.map((template) => (
              <li
                key={template.id}
                className="flex items-baseline gap-3 leading-8"
              >
                <span className="nb-hand w-28 shrink-0 text-lg text-muted-foreground">
                  {template.status === 'paused'
                    ? tTemplates('statusPaused')
                    : '↻'}
                </span>
                <Link
                  href={`/templates/${template.id}`}
                  className="hover:underline"
                >
                  {template.title}
                </Link>
              </li>
            ))}
            {nav.templates.length === 0 ? (
              <li className="italic leading-8 text-muted-foreground">
                <Link href="/templates/new" className="hover:underline">
                  {tTemplates('createButton')}…
                </Link>
              </li>
            ) : null}
          </ul>

          {nav.pendingInvites.length > 0 ? (
            <Sticky className="mt-10">
              <p className="nb-hand mb-2 text-xl">{t('invitesSticky')}</p>
              <ul className="flex flex-col gap-2 text-sm">
                {nav.pendingInvites.map((invite) => (
                  <PendingInviteRow key={invite.id} invite={invite} />
                ))}
              </ul>
            </Sticky>
          ) : null}
        </>
      }
    />
  );
}
