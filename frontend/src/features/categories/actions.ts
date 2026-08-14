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
