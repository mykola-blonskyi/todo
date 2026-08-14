import { notFound } from 'next/navigation';
import { graphqlFetch, GraphQLRequestError } from '@shared/lib/graphql-client';
import { ListDetail, type ListDetailData } from '@features/todo-list';

interface ListDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ListDetailPage({ params }: ListDetailPageProps) {
  const { id } = await params;

  let list: ListDetailData;
  let myUserId: string;
  try {
    const data = await graphqlFetch<{
      me: { id: string };
      list: ListDetailData;
    }>(
      `query ListDetail($id: ID!) {
        me { id }
        list(id: $id) {
          id
          title
          dueDate
          isOwner
          tasks {
            id
            title
            done
            dueDate
            comments { id body createdAt author { id email name } }
          }
          collaborators { id email name image }
          templateId
          comments { id body createdAt author { id email name } }
        }
      }`,
      { id },
    );
    list = data.list;
    myUserId = data.me.id;
  } catch (error) {
    if (error instanceof GraphQLRequestError) {
      notFound();
    }
    throw error;
  }

  return <ListDetail list={list} myUserId={myUserId} />;
}
