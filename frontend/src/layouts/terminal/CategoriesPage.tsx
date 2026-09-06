import { useTranslations } from 'next-intl';
import { CategoryCreateForm, CategoryRow } from '@features/categories';
import type { CategoriesPageProps } from '../types';
import { TuiHeading } from './Shell';

export function CategoriesPage({ nav, categories }: CategoriesPageProps) {
  const t = useTranslations('Categories');
  const tNav = useTranslations('Nav');

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <h1 className="font-bold">
        <span className="text-muted-foreground"># </span>
        {t('title').toLowerCase()}{' '}
        <span className="text-muted-foreground">({categories.length})</span>
      </h1>
      <div className="max-w-md">
        <CategoryCreateForm />
      </div>
      <ul className="flex flex-col">
        {categories.length === 0 ? (
          <li className="text-muted-foreground">{t('emptyState')}</li>
        ) : null}
        {categories.map((category) => {
          const lists = nav.lists.filter(
            (list) => list.myCategory?.id === category.id,
          );
          return (
            <li
              key={category.id}
              className="border-b border-dashed py-1 last:border-b-0"
            >
              <div className="flex items-center gap-2">
                <span className="text-primary">▾</span>
                <ul className="min-w-0 flex-1 font-semibold">
                  <CategoryRow category={category} />
                </ul>
              </div>
              <ul className="pl-6 text-muted-foreground">
                {lists.length === 0 ? <li>·</li> : null}
                {lists.map((list) => (
                  <li key={list.id}>└ {list.title}</li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
      <section>
        <TuiHeading>{tNav('uncategorized').toLowerCase()}</TuiHeading>
        <ul className="pl-6 text-muted-foreground">
          {nav.lists
            .filter((list) => !list.myCategory)
            .map((list) => (
              <li key={list.id}>└ {list.title}</li>
            ))}
        </ul>
      </section>
    </div>
  );
}
