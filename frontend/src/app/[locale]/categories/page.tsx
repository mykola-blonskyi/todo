import { getAppearance } from '@features/preferences/server';
import { getLayoutViews } from '@/layouts/registry';
import { fetchNavData } from '@/layouts/data';

export default async function CategoriesPage() {
  const [nav, appearance] = await Promise.all([
    fetchNavData(),
    getAppearance(),
  ]);
  const { CategoriesPage: View } = getLayoutViews(appearance.layout);

  return <View nav={nav} categories={nav.categories} />;
}
