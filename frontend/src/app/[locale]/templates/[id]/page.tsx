import { notFound } from 'next/navigation';
import { graphqlFetch, isMissing } from '@shared/lib/graphql-client';
import type { ListTemplate } from '@features/list-templates';
import { getAppearance } from '@features/preferences/server';
import { getLayoutViews } from '@/layouts/registry';
import { fetchNavData, fetchTemplates, TEMPLATE_FIELDS } from '@/layouts/data';

interface TemplateDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TemplateDetailPage({
  params,
}: TemplateDetailPageProps) {
  const { id } = await params;

  let template: ListTemplate;
  try {
    const data = await graphqlFetch<{ listTemplate: ListTemplate }>(
      `query TemplateDetail($id: ID!) {
        listTemplate(id: $id) { ${TEMPLATE_FIELDS} }
      }`,
      { id },
    );
    template = data.listTemplate;
  } catch (error) {
    if (isMissing(error)) {
      notFound();
    }
    throw error;
  }

  const [templates, nav, appearance] = await Promise.all([
    fetchTemplates(),
    fetchNavData(),
    getAppearance(),
  ]);
  const { TemplateFormPage: View } = getLayoutViews(appearance.layout);

  return <View nav={nav} template={template} templates={templates} />;
}
