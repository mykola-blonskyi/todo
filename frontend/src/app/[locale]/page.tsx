import { graphqlFetch } from '@shared/lib/graphql-client';
import { ListSummary } from '@shared/types/lists';
import { TodosList } from '@features/todos-list';
import type { PendingInvite } from '@features/list-sharing';
import type { Category } from '@features/categories';

interface HomePageProps {
  searchParams: Promise<{ categoryId?: string; uncategorized?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { categoryId, uncategorized } = await searchParams;
  const uncategorizedOnly = uncategorized === 'true';

  const {
    myLists: lists,
    pendingInvites,
    myCategories: categories,
  } = await graphqlFetch<{
    myLists: ListSummary[];
    pendingInvites: PendingInvite[];
    myCategories: Category[];
  }>(
    `query HomePage($categoryId: ID, $uncategorizedOnly: Boolean) {
      myLists(categoryId: $categoryId, uncategorizedOnly: $uncategorizedOnly) { id title }
      pendingInvites { id invitedAt list { id title } }
      myCategories { id name createdAt }
    }`,
    { categoryId: categoryId ?? null, uncategorizedOnly },
  );

  return (
    <TodosList
      lists={lists}
      pendingInvites={pendingInvites}
      categories={categories}
    />
  );
}
