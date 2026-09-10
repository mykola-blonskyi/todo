'use server';

import { revalidatePath } from 'next/cache';
import { graphqlFetch } from '@shared/lib/graphql-client';

export async function createCategoryAction(formData: FormData) {
  const name = formData.get('name');
  if (typeof name !== 'string' || !name.trim()) {
    return;
  }

  await graphqlFetch(
    `mutation CreateCategory($name: String!) {
      createCategory(name: $name) { id }
    }`,
    { name },
  );

  revalidatePath('/[locale]/categories', 'page');
}

export async function renameCategoryAction(id: string, formData: FormData) {
  const name = formData.get('name');
  if (typeof name !== 'string' || !name.trim()) {
    return;
  }

  await graphqlFetch(
    `mutation RenameCategory($id: ID!, $name: String!) {
      renameCategory(id: $id, name: $name) { id }
    }`,
    { id, name },
  );

  revalidatePath('/[locale]/categories', 'page');
}

export async function deleteCategoryAction(id: string) {
  await graphqlFetch(
    `mutation DeleteCategory($id: ID!) { deleteCategory(id: $id) }`,
    { id },
  );

  revalidatePath('/[locale]/categories', 'page');
  revalidatePath('/[locale]', 'page');
}

export async function deleteCategoriesAction(
  ids: string[],
): Promise<{ succeededIds: string[]; failedIds: string[] }> {
  const { deleteCategories } = await graphqlFetch<{
    deleteCategories: { deletedIds: string[]; failedIds: string[] };
  }>(
    `mutation DeleteCategories($ids: [ID!]!) {
      deleteCategories(ids: $ids) { deletedIds failedIds }
    }`,
    { ids },
  );

  revalidatePath('/[locale]/categories', 'page');
  revalidatePath('/[locale]', 'page');
  return {
    succeededIds: deleteCategories.deletedIds,
    failedIds: deleteCategories.failedIds,
  };
}
