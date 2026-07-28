import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { graphqlFetch, GraphQLRequestError } from '@/lib/graphql-client';
import { Link } from '@/lib/i18n/navigation';

interface ListDetail {
  id: string;
  title: string;
}

interface ListDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ListDetailPage({ params }: ListDetailPageProps) {
  const { id } = await params;
  const t = await getTranslations('Lists');

  let list: ListDetail;
  try {
    const data = await graphqlFetch<{ list: ListDetail }>(
      `query ListDetail($id: ID!) { list(id: $id) { id title } }`,
      { id },
    );
    list = data.list;
  } catch (error) {
    if (error instanceof GraphQLRequestError) {
      notFound();
    }
    throw error;
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-8">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← {t('backToLists')}
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">{list.title}</h1>
    </div>
  );
}
