import { useTranslations } from 'next-intl';
import { Link } from '@shared/lib/i18n/navigation';
import {
  CategoryCreateForm,
  CategoryRow,
  CategorySelectionBar,
  CategorySelectionToggle,
} from '@features/categories';
import type { CategoriesPageProps } from '../types';
import { categoryColor } from '../shared/list-stats';
import { activeLists } from '../shared/category-filter';

// Left: the editable category list. Right: what each category holds, so
// renaming/deleting happens with the consequences in view.
export function CategoriesPage({ nav, categories }: CategoriesPageProps) {
  const t = useTranslations('Categories');
  const tNav = useTranslations('Nav');
  const tOverview = useTranslations('Overview');

  const live = activeLists(nav.lists);

  const listsByCategory = new Map<string, typeof nav.lists>();
  const uncategorized = live.filter((list) => !list.myCategory);
  for (const list of live) {
    if (list.myCategory) {
      const bucket = listsByCategory.get(list.myCategory.id) ?? [];
      bucket.push(list);
      listsByCategory.set(list.myCategory.id, bucket);
    }
  }

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <section
        aria-label={t('title')}
        className="flex w-full shrink-0 flex-col gap-3 border-b p-4 md:w-80 md:border-b-0 md:border-r"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{t('title')}</h2>
          <CategorySelectionToggle className="-mr-2" />
        </div>
        <CategorySelectionBar />
        <CategoryCreateForm />
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('emptyState')}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {categories.map((category) => (
              <CategoryRow key={category.id} category={category} />
            ))}
          </ul>
        )}
      </section>
      <section className="flex flex-1 flex-col gap-6 p-6 md:p-8">
        <h1 className="text-xl font-semibold tracking-tight">{t('title')}</h1>
        <div className="grid max-w-4xl gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => {
            const lists = listsByCategory.get(category.id) ?? [];
            return (
              <div key={category.id} className="rounded-lg border bg-card p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: categoryColor(category.id) }}
                  />
                  <Link
                    href={`/?categoryId=${category.id}`}
                    className="truncate text-sm font-semibold hover:underline"
                  >
                    {category.name}
                  </Link>
                  <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                    {lists.length}
                  </span>
                </div>
                {lists.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {tOverview('emptyCategory')}
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1 text-sm">
                    {lists.map((list) => (
                      <li key={list.id}>
                        <Link
                          href={`/lists/${list.id}`}
                          className="hover:underline"
                        >
                          {list.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
          <div className="rounded-lg border border-dashed p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-full bg-border"
              />
              {tNav('uncategorized')}
              <span className="ml-auto text-xs tabular-nums">
                {uncategorized.length}
              </span>
            </div>
            <ul className="flex flex-col gap-1 text-sm">
              {uncategorized.map((list) => (
                <li key={list.id}>
                  <Link href={`/lists/${list.id}`} className="hover:underline">
                    {list.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
