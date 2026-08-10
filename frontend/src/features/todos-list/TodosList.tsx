'use client';

import { ListSummary } from '@shared/types/lists';
import { useTranslations } from 'next-intl';
import { ListRow } from './ListRow';
import { CreateListForm } from './CreateListForm';

interface TodosListProps {
  lists: ListSummary[];
}
export const TodosList = ({ lists }: TodosListProps) => {
  const t = useTranslations('Lists');
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 p-8">
      <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>

      <CreateListForm />

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
