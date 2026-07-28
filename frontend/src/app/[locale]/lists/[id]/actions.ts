'use server';

import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';
import { redirect } from '@/lib/i18n/navigation';
import { graphqlFetch } from '@/lib/graphql-client';

export async function renameListAction(id: string, formData: FormData) {
  const title = formData.get('title');
  if (typeof title !== 'string' || !title.trim()) {
    return;
  }

  await graphqlFetch(
    `mutation RenameList($id: ID!, $title: String!) {
      renameList(id: $id, title: $title) { id }
    }`,
    { id, title },
  );

  revalidatePath('/[locale]/lists/[id]', 'page');
}

export async function deleteListAction(id: string) {
  await graphqlFetch(`mutation DeleteList($id: ID!) { deleteList(id: $id) }`, { id });

  revalidatePath('/[locale]', 'page');
  const locale = await getLocale();
  redirect({ href: '/', locale });
}
