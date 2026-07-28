'use server';

import { revalidatePath } from 'next/cache';
import { graphqlFetch } from '@/lib/graphql-client';

export async function createListAction(formData: FormData) {
  const title = formData.get('title');
  if (typeof title !== 'string' || !title.trim()) {
    return;
  }

  await graphqlFetch(
    `mutation CreateList($title: String!) {
      createList(title: $title) { id }
    }`,
    { title },
  );

  revalidatePath('/[locale]', 'page');
}
