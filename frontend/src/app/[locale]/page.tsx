import { graphqlFetch } from '@shared/lib/graphql-client';
import { ListSummary } from '@shared/types/lists';
import { TodosList } from '@features/todos-list';

export default async function HomePage() {
  const { myLists: lists } = await graphqlFetch<{ myLists: ListSummary[] }>(
    `query { myLists { id title } }`,
  );

  return <TodosList lists={lists} />;
}
