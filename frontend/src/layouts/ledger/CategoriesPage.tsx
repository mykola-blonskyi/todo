import { useTranslations } from 'next-intl';
import { CategoryCreateForm, CategoryRow } from '@features/categories';
import type { CategoriesPageProps } from '../types';
import { categoryColor, listProgress } from '../shared/list-stats';
import { activeLists } from '../shared/category-filter';

export function CategoriesPage({ nav, categories }: CategoriesPageProps) {
  const t = useTranslations('Categories');
  const tLedger = useTranslations('Ledger');
  const tNav = useTranslations('Nav');

  const live = activeLists(nav.lists);

  const rows = [
    ...categories.map((category) => ({
      key: category.id,
      category,
      lists: live.filter((list) => list.myCategory?.id === category.id),
    })),
  ];
  const uncategorized = live.filter((list) => !list.myCategory);

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2">
        <h1 className="font-semibold">{t('title')}</h1>
        <span className="text-xs text-muted-foreground">
          {categories.length}
        </span>
        <div className="ml-auto w-full max-w-sm sm:w-auto">
          <CategoryCreateForm />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-muted/60 text-xs">
            <tr>
              <th scope="col" className="w-8 px-3 py-2" />
              <th
                scope="col"
                className="px-3 py-2 text-left font-semibold text-muted-foreground"
              >
                {tLedger('colName')}
              </th>
              <th
                scope="col"
                className="px-3 py-2 text-left font-semibold text-muted-foreground"
              >
                {tNav('lists')}
              </th>
              <th
                scope="col"
                className="px-3 py-2 text-left font-semibold text-muted-foreground"
              >
                {tLedger('colOpenTasks')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  {t('emptyState')}
                </td>
              </tr>
            ) : null}
            {rows.map(({ key, category, lists }) => {
              const open = lists.reduce((sum, list) => {
                const progress = listProgress(list);
                return sum + progress.total - progress.done;
              }, 0);
              return (
                <tr key={key} className="border-t hover:bg-muted/50">
                  <td className="px-3 py-2">
                    <span
                      aria-hidden="true"
                      className="block h-2.5 w-2.5 rounded-full"
                      style={{ background: categoryColor(category.id) }}
                    />
                  </td>
                  <td className="px-3 py-1">
                    <ul>
                      <CategoryRow category={category} />
                    </ul>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {lists.length === 0
                      ? '—'
                      : lists.map((list) => list.title).join(', ')}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">
                    {open}
                  </td>
                </tr>
              );
            })}
            <tr className="border-t text-muted-foreground">
              <td className="px-3 py-2">
                <span
                  aria-hidden="true"
                  className="block h-2.5 w-2.5 rounded-full bg-border"
                />
              </td>
              <td className="px-3 py-2">{tNav('uncategorized')}</td>
              <td className="px-3 py-2">
                {uncategorized.length === 0
                  ? '—'
                  : uncategorized.map((list) => list.title).join(', ')}
              </td>
              <td className="px-3 py-2 tabular-nums">
                {uncategorized.reduce((sum, list) => {
                  const progress = listProgress(list);
                  return sum + progress.total - progress.done;
                }, 0)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
