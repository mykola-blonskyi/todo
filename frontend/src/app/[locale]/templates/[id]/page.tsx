import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Link } from '@shared/lib/i18n/navigation';
import { graphqlFetch, GraphQLRequestError } from '@shared/lib/graphql-client';
import {
  TemplateForm,
  TemplateCollaboratorSearch,
  TemplateCollaboratorsList,
  type ListTemplate,
} from '@features/list-templates';
import { updateListTemplateAction } from '@features/list-templates/actions';

interface TemplateDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TemplateDetailPage({
  params,
}: TemplateDetailPageProps) {
  const { id } = await params;
  const t = await getTranslations('ListTemplates');

  let template: ListTemplate;
  try {
    const data = await graphqlFetch<{ listTemplate: ListTemplate }>(
      `query TemplateDetail($id: ID!) {
        listTemplate(id: $id) {
          id
          title
          taskTitles
          recurrenceType
          weekDays
          dayOfMonth
          intervalDays
          streakDays
          streakStartDate
          timezone
          status
          collaborators { id email name image }
        }
      }`,
      { id },
    );
    template = data.listTemplate;
  } catch (error) {
    if (error instanceof GraphQLRequestError) {
      notFound();
    }
    throw error;
  }

  const updateWithId = updateListTemplateAction.bind(null, template.id);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 p-8">
      <Link
        href="/templates"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← {t('backToTemplates')}
      </Link>

      <h1 className="text-3xl font-semibold tracking-tight">
        {t('editTemplateTitle')}
      </h1>

      <TemplateForm
        initialValues={template}
        onSubmit={updateWithId}
        submitLabel={t('saveButton')}
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          {t('collaboratorsTitle')}
        </h2>
        <TemplateCollaboratorSearch templateId={template.id} />
      </section>

      <TemplateCollaboratorsList
        templateId={template.id}
        collaborators={template.collaborators}
      />
    </div>
  );
}
