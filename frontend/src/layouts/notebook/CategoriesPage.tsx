import { useTranslations } from 'next-intl';
import { Link } from '@shared/lib/i18n/navigation';
import {
  CategoryCreateForm,
  CategoryRow,
  CategorySelectionBar,
  CategorySelectionToggle,
} from '@features/categories';
import type { CategoriesPageProps } from '../types';
import { Spread } from './Spread';
import { categoryColor } from '../shared/list-stats';
import { activeLists } from '../shared/category-filter';

// Left page: the tabs themselves (rename / delete / add). Right page: which
// lists sit behind each tab.
export function CategoriesPage({ nav, categories }: CategoriesPageProps) {
  const t = useTranslations('Categories');
  const tNav = useTranslations('Nav');
  const tNotebook = useTranslations('Notebook');
  const tOverview = useTranslations('Overview');

  const live = activeLists(nav.lists);

  return (
    <Spread
      tabs={categories}
      tabsLabel={tNav('categories')}
      left={
        <>
          <div className="flex items-center justify-between gap-2">
            <h2 className="nb-hand text-4xl font-semibold leading-8">
              {t('title')}
            </h2>
            <CategorySelectionToggle />
          </div>
          <p className="mt-2 text-sm leading-8 text-muted-foreground">
            {tNotebook('tabsHint')}
          </p>
          <div className="mt-6 text-sm">
            <CategorySelectionBar className="mb-4" />
            <CategoryCreateForm className="mb-4" />
            {categories.length === 0 ? (
              <p className="italic text-muted-foreground">{t('emptyState')}</p>
            ) : (
              <ul className="flex flex-col">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center gap-3 leading-8"
                  >
                    <span
                      aria-hidden="true"
                      className="h-3 w-3 shrink-0 rounded-sm"
                      style={{ background: categoryColor(category.id) }}
                    />
                    <ul className="min-w-0 flex-1">
                      <CategoryRow category={category} />
                    </ul>
                  </div>
                ))}
              </ul>
            )}
          </div>
        </>
      }
      right={
        <>
          <h2 className="nb-hand text-4xl font-semibold leading-8">
            {tNotebook('behindTabs')}
          </h2>
          <div className="mt-8">
            {[
              ...categories.map((category) => ({
                key: category.id,
                name: category.name,
                lists: live.filter(
                  (list) => list.myCategory?.id === category.id,
                ),
              })),
              {
                key: 'uncategorized',
                name: tNav('uncategorized'),
                lists: live.filter((list) => !list.myCategory),
              },
            ].map((group) => (
              <div key={group.key} className="mb-4">
                <h3 className="nb-hand text-2xl leading-8">{group.name}</h3>
                {group.lists.length === 0 ? (
                  <p className="italic leading-8 text-muted-foreground">
                    {tOverview('emptyCategory')}
                  </p>
                ) : (
                  <ul>
                    {group.lists.map((list) => (
                      <li key={list.id} className="leading-8">
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
            ))}
          </div>
        </>
      }
    />
  );
}
