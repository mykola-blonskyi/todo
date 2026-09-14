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

export async function updateListDueDateAction(id: string, formData: FormData) {
  const dueDate = formData.get('dueDate');

  await graphqlFetch(
    `mutation UpdateListDueDate($id: ID!, $dueDate: DateTime) {
      updateListDueDate(id: $id, dueDate: $dueDate) { id }
    }`,
    { id, dueDate: typeof dueDate === 'string' && dueDate ? dueDate : null },
  );

  revalidatePath('/[locale]/lists/[id]', 'page');
}

export async function unarchiveListAction(id: string) {
  await graphqlFetch(
    `mutation UnarchiveList($id: ID!) { unarchiveList(id: $id) { id } }`,
    { id },
  );

  revalidatePath('/[locale]', 'page');
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

export async function assignCategoryAction(listId: string, categoryId: string) {
  await graphqlFetch(
    `mutation AssignListCategory($listId: ID!, $categoryId: ID!) {
      assignListCategory(listId: $listId, categoryId: $categoryId)
    }`,
    { listId, categoryId },
  );

  revalidatePath('/[locale]/lists/[id]', 'page');
  revalidatePath('/[locale]', 'page');
}

export async function unassignCategoryAction(listId: string) {
  await graphqlFetch(
    `mutation UnassignListCategory($listId: ID!) {
      unassignListCategory(listId: $listId)
    }`,
    { listId },
  );

  revalidatePath('/[locale]/lists/[id]', 'page');
  revalidatePath('/[locale]', 'page');
}

export async function moveTaskAction(taskId: string, direction: 'up' | 'down') {
  await graphqlFetch(
    `mutation MoveTask($taskId: ID!, $direction: TaskMoveDirection!) {
      moveTask(id: $taskId, direction: $direction) { id }
    }`,
    { taskId, direction },
  );

  revalidatePath('/[locale]/lists/[id]', 'page');
}
