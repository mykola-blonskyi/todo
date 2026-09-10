import { getAppearance } from '@features/preferences/server';
import { ListSelectionProvider } from '@features/todos-list';
import { getLayoutViews } from '@/layouts/registry';
import {
  applyCategoryFilter,
  fetchNavData,
  parseCategoryFilter,
} from '@/layouts/data';

interface HomePageProps {
  searchParams: Promise<{
    categoryId?: string;
    uncategorized?: string;
    archived?: string;
  }>;
}

// Lists overview. Data is the per-request cached nav fetch (shared with the
// shell); the URL-driven category/archive filter is applied here so the shell
// keeps seeing every list, archived ones included, for its counts.
export default async function HomePage({ searchParams }: HomePageProps) {
  const [params, nav, appearance] = await Promise.all([
    searchParams,
    fetchNavData(),
    getAppearance(),
  ]);
  const filter = parseCategoryFilter(params);
  const { ListsPage } = getLayoutViews(appearance.layout);
  const visible = applyCategoryFilter(nav.lists, filter);

  return (
    <ListSelectionProvider lists={visible}>
      <ListsPage nav={nav} lists={visible} filter={filter} />
    </ListSelectionProvider>
  );
}
