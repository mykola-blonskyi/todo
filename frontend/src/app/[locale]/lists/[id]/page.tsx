import { notFound } from 'next/navigation';
import { graphqlFetch, GraphQLRequestError } from '@shared/lib/graphql-client';
import { ListDetail, type ListDetailData } from '@features/todo-list';
import type { Category } from '@features/categories';

interface ListDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ListDetailPage({ params }: ListDetailPageProps) {
  const { id } = await params;

  let list: ListDetailData;
  let myUserId: string;
  let googleCalendarConnected: boolean;
  let categories: Category[];
  try {
    const data = await graphqlFetch<{
      me: { id: string; googleCalendarConnected: boolean };
      list: ListDetailData;
      myCategories: Category[];
    }>(
      `query ListDetail($id: ID!) {
        me { id googleCalendarConnected }
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
          myCategory { id name }
        }
        myCategories { id name createdAt }
      }`,
      { id },
    );
    list = data.list;
    myUserId = data.me.id;
    googleCalendarConnected = data.me.googleCalendarConnected;
    categories = data.myCategories;
  } catch (error) {
    if (error instanceof GraphQLRequestError) {
      notFound();
    }
    throw error;
  }

  return (
    <ListDetail
      list={list}
      myUserId={myUserId}
      googleCalendarConnected={googleCalendarConnected}
      categories={categories}
    />
  );
}
