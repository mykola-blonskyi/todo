'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@shared/lib/i18n/navigation';
import { Button } from '@ui/components/button';
import { Input } from '@ui/components/input';
import { createCategoryAction } from './actions';
import { CategoryRow } from './CategoryRow';
import type { Category } from './types';

interface CategoriesListProps {
  categories: Category[];
}

export function CategoriesList({ categories }: CategoriesListProps) {
  const t = useTranslations('Categories');

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-8">
      <Link
        href="/"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← {t('backToLists')}
      </Link>

      <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>

      <form action={createCategoryAction} className="flex gap-2">
        <Input name="name" placeholder={t('createPlaceholder')} required />
        <Button type="submit">{t('createButton')}</Button>
      </form>

      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('emptyState')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {categories.map((category) => (
            <CategoryRow key={category.id} category={category} />
          ))}
        </ul>
      )}
    </div>
  );
}
