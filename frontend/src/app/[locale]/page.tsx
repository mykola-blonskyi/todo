import { graphqlFetch } from '@shared/lib/graphql-client';
import { ListSummary } from '@shared/types/lists';
import { TodosList } from '@features/todos-list';
import type { PendingInvite } from '@features/list-sharing';

export default async function HomePage() {
  const { myLists: lists, pendingInvites } = await graphqlFetch<{
    myLists: ListSummary[];
    pendingInvites: PendingInvite[];
  }>(
    `query HomePage {
      myLists { id title }
      pendingInvites { id invitedAt list { id title } }
    }`,
  );

  return <TodosList lists={lists} pendingInvites={pendingInvites} />;
}
