import { useTranslations } from 'next-intl';
import { CategoryCreateForm, CategoryRow } from '@features/categories';
import type { CategoriesPageProps } from '../types';
import { Group } from './BackLink';
import { categoryColor } from '../shared/list-stats';
import { activeLists } from '../shared/category-filter';

export function CategoriesPage({ nav, categories }: CategoriesPageProps) {
  const t = useTranslations('Categories');

  const live = activeLists(nav.lists);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-3xl font-extrabold tracking-tight">{t('title')}</h1>
      <Group>
        <CategoryCreateForm />
      </Group>
      {categories.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          {t('emptyState')}
        </p>
      ) : (
        <ul className="flex flex-col overflow-hidden rounded-2xl bg-card shadow-[0_1px_2px_hsl(var(--foreground)/0.06)]">
          {categories.map((category) => {
            const count = live.filter(
              (list) => list.myCategory?.id === category.id,
            ).length;
            return (
              <div
                key={category.id}
                className="flex items-center gap-3 border-b px-4 py-2 last:border-b-0"
              >
                <span
                  aria-hidden="true"
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ background: categoryColor(category.id) }}
                />
                <ul className="min-w-0 flex-1 font-bold">
                  <CategoryRow category={category} />
                </ul>
                <span className="text-xs font-bold tabular-nums text-muted-foreground">
                  {count}
                </span>
              </div>
            );
          })}
        </ul>
      )}
    </div>
  );
}
