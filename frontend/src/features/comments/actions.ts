'use server';

import { revalidatePath } from 'next/cache';
import { graphqlFetch } from '@shared/lib/graphql-client';

async function addComment(
  target: { taskId?: string; listId?: string },
  formData: FormData,
) {
  const body = formData.get('body');
  if (typeof body !== 'string' || !body.trim()) {
    return;
  }

  await graphqlFetch(
    `mutation AddComment($taskId: ID, $listId: ID, $body: String!) {
      addComment(taskId: $taskId, listId: $listId, body: $body) { id }
    }`,
    { taskId: target.taskId ?? null, listId: target.listId ?? null, body },
  );

  revalidatePath('/[locale]/lists/[id]', 'page');
}

export async function addListCommentAction(listId: string, formData: FormData) {
  await addComment({ listId }, formData);
}

export async function addTaskCommentAction(taskId: string, formData: FormData) {
  await addComment({ taskId }, formData);
}
