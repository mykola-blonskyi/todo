import { cache } from 'react';
import { graphqlFetch } from '@shared/lib/graphql-client';
import type { Category } from '@features/categories';
import type { PendingInvite } from '@features/list-sharing';
import type { ListTemplate } from '@features/list-templates';
import type {
  CurrentUser,
  ListOverview,
  NavData,
  TemplateOverview,
} from './types';

// Server Components only. One GraphQL round-trip per request for everything
// the shell navigation AND the overview page need - React's per-request
// cache() dedupes the two callers (root layout + page), and the backend's
// DataLoaders (TODO-47) keep the nested tasks/collaborators/myCategory
// fan-out flat.
export const fetchNavData = cache(async (): Promise<NavData> => {
  const data = await graphqlFetch<{
    me: CurrentUser;
    myLists: ListOverview[];
    pendingInvites: PendingInvite[];
    myCategories: Category[];
    myListTemplates: TemplateOverview[];
  }>(
    `query NavData {
      me { id email name googleCalendarConnected }
      myLists {
        id
        title
        dueDate
        updatedAt
        createdAt
        archivedAt
        templateId
        isOwner
        myCategory { id name }
        tasks { id title done dueDate }
        collaborators { id email name image }
      }
      pendingInvites { id invitedAt list { id title } }
      myCategories { id name createdAt }
      myListTemplates { id title status }
    }`,
  );

  return {
    user: data.me,
    lists: data.myLists,
    categories: data.myCategories,
    pendingInvites: data.pendingInvites,
    templates: data.myListTemplates,
  };
});

export {
  applyCategoryFilter,
  parseCategoryFilter,
} from './shared/category-filter';

// Everything the template form and rows need - shared by the templates
// overview, the edit page and the "new" page (which lists siblings in the
// column/side layouts).
export const TEMPLATE_FIELDS = `
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
`;

export const fetchTemplates = cache(async (): Promise<ListTemplate[]> => {
  const { myListTemplates } = await graphqlFetch<{
    myListTemplates: ListTemplate[];
  }>(`query Templates { myListTemplates { ${TEMPLATE_FIELDS} } }`);
  return myListTemplates;
});
