import { notFound } from 'next/navigation';
import { graphqlFetch, GraphQLRequestError } from '@shared/lib/graphql-client';
import { ListDetail, type ListDetailData } from '@features/todo-list';

interface ListDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ListDetailPage({ params }: ListDetailPageProps) {
  const { id } = await params;

  let list: ListDetailData;
  try {
    const data = await graphqlFetch<{ list: ListDetailData }>(
      `query ListDetail($id: ID!) {
        list(id: $id) {
          id
          title
          isOwner
          tasks { id title done dueDate }
        }
      }`,
      { id },
    );
    list = data.list;
  } catch (error) {
    if (error instanceof GraphQLRequestError) {
      notFound();
    }
    throw error;
  }

  return <ListDetail list={list} />;
}
