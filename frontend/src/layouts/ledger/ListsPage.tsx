import { useTranslations } from 'next-intl';
import { Link } from '@shared/lib/i18n/navigation';
import { cn } from '@shared/lib/utils';
import { CreateListForm } from '@features/todos-list';
import { PendingInviteRow } from '@features/list-sharing/PendingInviteRow';
import type { ListsPageProps } from '../types';
import { LedgerTable } from './LedgerTable';

export function ListsPage({ nav, lists, filter }: ListsPageProps) {
  const t = useTranslations('Ledger');
  const tNav = useTranslations('Nav');
  const tLists = useTranslations('Lists');

  const chips = [
    {
      key: 'all',
      href: '/' as const,
      label: tNav('allLists'),
      active: !filter.categoryId && !filter.uncategorizedOnly,
    },
    ...nav.categories.map((category) => ({
      key: category.id,
      href: `/?categoryId=${category.id}` as const,
      label: category.name,
      active: filter.categoryId === category.id,
    })),
    {
      key: 'none',
      href: '/?uncategorized=true' as const,
      label: tNav('uncategorized'),
      active: filter.uncategorizedOnly,
    },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2">
        <h1 className="mr-2 font-semibold">{tNav('lists')}</h1>
        <nav aria-label={tNav('categories')} className="flex flex-wrap gap-1">
          {chips.map((chip) => (
            <Link
              key={chip.key}
              href={chip.href}
              className={cn(
                'rounded-md border px-2.5 py-1 text-xs font-medium',
                chip.active
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground',
              )}
            >
              {chip.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto w-full max-w-sm sm:w-auto">
          <CreateListForm />
        </div>
      </div>

      {nav.pendingInvites.length > 0 ? (
        <section className="border-b bg-primary/5 px-4 py-2">
          <h2 className="mb-1 text-xs font-semibold text-primary">
            {t('invitesTitle')}
          </h2>
          <ul className="flex flex-col gap-1 [&_.ui-card]:border-primary/30">
            {nav.pendingInvites.map((invite) => (
              <PendingInviteRow key={invite.id} invite={invite} />
            ))}
          </ul>
        </section>
      ) : null}

      <LedgerTable lists={lists} />
      <p className="sr-only">{tLists('createPlaceholder')}</p>
    </>
  );
}
