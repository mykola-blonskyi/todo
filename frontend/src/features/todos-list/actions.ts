'use server';

import { revalidatePath } from 'next/cache';
import { graphqlFetch } from '@shared/lib/graphql-client';

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

// Board layout: a list created inside a category column starts out filed
// there. Two mutations, not one - the backend keeps createList and category
// assignment separate (Rule 22: assignment is per-user), and a failed
// assignment still leaves a usable list.
export async function createListInCategoryAction(
  categoryId: string | null,
  formData: FormData,
) {
  const title = formData.get('title');
  if (typeof title !== 'string' || !title.trim()) {
    return;
  }

  const { createList } = await graphqlFetch<{ createList: { id: string } }>(
    `mutation CreateList($title: String!) {
      createList(title: $title) { id }
    }`,
    { title },
  );

  if (categoryId) {
    await graphqlFetch(
      `mutation AssignListCategory($listId: ID!, $categoryId: ID!) {
        assignListCategory(listId: $listId, categoryId: $categoryId)
      }`,
      { listId: createList.id, categoryId },
    );
  }

  revalidatePath('/[locale]', 'page');
}
