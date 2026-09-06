import { useTranslations } from 'next-intl';
import { Link } from '@shared/lib/i18n/navigation';
import { CategoryCreateForm, CategoryRow } from '@features/categories';
import type { CategoriesPageProps } from '../types';
import { categoryColor, listProgress } from '../shared/list-stats';

// The board's columns, editable: each category is a column headed by its
// rename/delete row, with the lists filed under it as read-only cards.
export function CategoriesPage({ nav, categories }: CategoriesPageProps) {
  const t = useTranslations('Categories');
  const tNav = useTranslations('Nav');
  const tOverview = useTranslations('Overview');

  const columns = [
    ...categories.map((category) => ({
      key: category.id,
      category,
      lists: nav.lists.filter((list) => list.myCategory?.id === category.id),
    })),
  ];
  const uncategorized = nav.lists.filter((list) => !list.myCategory);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <h1 className="text-xl font-extrabold tracking-tight">{t('title')}</h1>
      <div className="flex gap-4 overflow-x-auto">
        <section
          aria-label={t('createButton')}
          className="flex w-64 shrink-0 flex-col gap-2 rounded-xl border-2 border-dashed p-3"
        >
          <h2 className="text-sm font-bold">{t('createButton')}</h2>
          <CategoryCreateForm className="flex-col" />
        </section>
        {columns.map(({ key, category, lists }) => (
          <section
            key={key}
            aria-label={category.name}
            className="flex w-64 shrink-0 flex-col gap-2"
          >
            <header className="rounded-xl border bg-card p-2 pl-3">
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: categoryColor(category.id) }}
                />
                {lists.length} · {tOverview('tasks').toLowerCase()}{' '}
                {lists.reduce((sum, list) => sum + list.tasks.length, 0)}
              </div>
              <ul>
                <CategoryRow category={category} />
              </ul>
            </header>
            {lists.length === 0 ? (
              <p className="px-2 text-xs text-muted-foreground">
                {tOverview('emptyCategory')}
              </p>
            ) : (
              lists.map((list) => {
                const progress = listProgress(list);
                return (
                  <Link
                    key={list.id}
                    href={`/lists/${list.id}`}
                    className="rounded-xl border bg-card px-3 py-2 text-sm font-semibold shadow-sm hover:shadow-md"
                  >
                    {list.title}
                    <span className="ml-2 text-xs font-semibold text-muted-foreground">
                      {progress.done}/{progress.total}
                    </span>
                  </Link>
                );
              })
            )}
          </section>
        ))}
        <section
          aria-label={tNav('uncategorized')}
          className="flex w-64 shrink-0 flex-col gap-2 opacity-80"
        >
          <header className="flex items-center gap-2 px-1 text-sm font-bold text-muted-foreground">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-full bg-border"
            />
            {tNav('uncategorized')}
            <span className="text-xs tabular-nums">{uncategorized.length}</span>
          </header>
          {uncategorized.map((list) => (
            <Link
              key={list.id}
              href={`/lists/${list.id}`}
              className="rounded-xl border bg-card px-3 py-2 text-sm font-semibold"
            >
              {list.title}
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}
