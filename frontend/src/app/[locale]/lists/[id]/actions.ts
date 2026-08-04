'use server';

import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';
import { redirect } from '@shared/lib/i18n/navigation';
import { graphqlFetch } from '@shared/lib/graphql-client';

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
  await graphqlFetch(`mutation DeleteList($id: ID!) { deleteList(id: $id) }`, {
    id,
  });

  revalidatePath('/[locale]', 'page');
  const locale = await getLocale();
  redirect({ href: '/', locale });
}

export async function createTaskAction(listId: string, formData: FormData) {
  const title = formData.get('title');
  if (typeof title !== 'string' || !title.trim()) {
    return;
  }

  await graphqlFetch(
    `mutation CreateTask($listId: ID!, $title: String!) {
      createTask(listId: $listId, title: $title) { id }
    }`,
    { listId, title },
  );

  revalidatePath('/[locale]/lists/[id]', 'page');
}

export async function toggleTaskDoneAction(id: string) {
  await graphqlFetch(
    `mutation ToggleTaskDone($id: ID!) { toggleTaskDone(id: $id) { id } }`,
    {
      id,
    },
  );

  revalidatePath('/[locale]/lists/[id]', 'page');
}

export async function updateTaskAction(
  id: string,
  title: string,
  dueDate: string | null,
) {
  if (!title.trim()) {
    return;
  }

  await graphqlFetch(
    `mutation UpdateTask($id: ID!, $title: String, $dueDate: DateTime) {
      updateTask(id: $id, title: $title, dueDate: $dueDate) { id }
    }`,
    { id, title, dueDate },
  );

  revalidatePath('/[locale]/lists/[id]', 'page');
}

export async function deleteTaskAction(id: string) {
  await graphqlFetch(`mutation DeleteTask($id: ID!) { deleteTask(id: $id) }`, {
    id,
  });

  revalidatePath('/[locale]/lists/[id]', 'page');
}

export async function moveTaskAction(
  listId: string,
  taskId: string,
  direction: 'up' | 'down',
) {
  const data = await graphqlFetch<{ list: { tasks: { id: string }[] } }>(
    `query TaskOrder($id: ID!) { list(id: $id) { tasks { id } } }`,
    { id: listId },
  );

  const ids = data.list.tasks.map((task) => task.id);
  const index = ids.indexOf(taskId);
  const swapWith = direction === 'up' ? index - 1 : index + 1;
  if (index === -1 || swapWith < 0 || swapWith >= ids.length) {
    return;
  }
  [ids[index], ids[swapWith]] = [ids[swapWith], ids[index]];

  await graphqlFetch(
    `mutation ReorderTasks($listId: ID!, $taskIds: [ID!]!) {
      reorderTasks(listId: $listId, taskIds: $taskIds) { id }
    }`,
    { listId, taskIds: ids },
  );

  revalidatePath('/[locale]/lists/[id]', 'page');
}
