import { getAppearance } from '@features/preferences/server';
import { getLayoutViews } from '@/layouts/registry';
import { fetchNavData, fetchTemplates } from '@/layouts/data';

export default async function TemplatesPage() {
  const [templates, nav, appearance] = await Promise.all([
    fetchTemplates(),
    fetchNavData(),
    getAppearance(),
  ]);
  const { TemplatesPage: View } = getLayoutViews(appearance.layout);

  return <View nav={nav} templates={templates} />;
}
