import { notFound } from 'next/navigation';
import { graphqlFetch, isMissing } from '@shared/lib/graphql-client';
import type { ListDetailData } from '@features/todo-list';
import { getAppearance } from '@features/preferences/server';
import { getLayoutViews } from '@/layouts/registry';
import { fetchNavData } from '@/layouts/data';

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
          createdAt
          comments { id body createdAt author { id email name } }
          myCategory { id name }
        }
      }`,
      { id },
    );
    list = data.list;
  } catch (error) {
    if (isMissing(error)) {
      notFound();
    }
    throw error;
  }

  const [nav, appearance] = await Promise.all([
    fetchNavData(),
    getAppearance(),
  ]);
  const { ListDetailPage: View } = getLayoutViews(appearance.layout);

  return <View nav={nav} list={list} />;
}
