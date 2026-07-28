import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { graphqlFetch, GraphQLRequestError } from '@/lib/graphql-client';
import { Link } from '@/lib/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { renameListAction, deleteListAction } from './actions';
import { DeleteListButton } from './delete-list-button';

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

  const renameWithId = renameListAction.bind(null, id);
  const deleteWithId = deleteListAction.bind(null, id);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-8">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← {t('backToLists')}
      </Link>

      <form action={renameWithId} className="flex gap-2">
        <Input name="title" defaultValue={list.title} required className="text-xl font-semibold" />
        <Button type="submit">{t('saveButton')}</Button>
      </form>

      <DeleteListButton
        action={deleteWithId}
        label={t('deleteButton')}
        confirmMessage={t('deleteConfirm')}
      />
    </div>
  );
}
