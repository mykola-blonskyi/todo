import { getAppearance } from '@features/preferences/server';
import { CategorySelectionProvider } from '@features/categories';
import { getLayoutViews } from '@/layouts/registry';
import { fetchNavData } from '@/layouts/data';

export default async function CategoriesPage() {
  const [nav, appearance] = await Promise.all([
    fetchNavData(),
    getAppearance(),
  ]);
  const { CategoriesPage: View } = getLayoutViews(appearance.layout);

  return (
    <CategorySelectionProvider categories={nav.categories}>
      <View nav={nav} categories={nav.categories} />
    </CategorySelectionProvider>
  );
}
