'use client';

import { ListSummary } from '@shared/types/lists';
import { useTranslations } from 'next-intl';
import { Link } from '@shared/lib/i18n/navigation';
import { PendingInvites, type PendingInvite } from '@features/list-sharing';
import { CategoryFilter, type Category } from '@features/categories';
import { ListRow } from './ListRow';
import { CreateListForm } from './CreateListForm';

interface TodosListProps {
  lists: ListSummary[];
  pendingInvites: PendingInvite[];
  categories: Category[];
}
export const TodosList = ({
  lists,
  pendingInvites,
  categories,
}: TodosListProps) => {
  const t = useTranslations('Lists');
  const tTemplates = useTranslations('ListTemplates');
  const tCategories = useTranslations('Categories');
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 p-8">
      <PendingInvites invites={pendingInvites} />

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>
        <div className="flex items-center gap-4">
          <Link
            href="/categories"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {tCategories('manageLink')}
          </Link>
          <Link
            href="/templates"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {tTemplates('title')}
          </Link>
        </div>
      </div>

      <CreateListForm />

      <CategoryFilter categories={categories} />

      {lists.length === 0 ? (
        <p className="text-muted-foreground">{t('emptyState')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {lists.map((list) => (
            <ListRow key={list.id} list={list} />
          ))}
        </ul>
      )}
    </div>
  );
};
