import { graphqlFetch } from '@shared/lib/graphql-client';
import { TemplatesList, type ListTemplate } from '@features/list-templates';

export default async function TemplatesPage() {
  const { myListTemplates: templates } = await graphqlFetch<{
    myListTemplates: ListTemplate[];
  }>(
    `query TemplatesPage {
      myListTemplates {
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
  );

  return <TemplatesList templates={templates} />;
}
