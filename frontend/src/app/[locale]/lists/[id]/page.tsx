import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { graphqlFetch, GraphQLRequestError } from '@shared/lib/graphql-client';
import { Link } from '@shared/lib/i18n/navigation';
import { Button } from '@/shared/ui/components/button';
import { Input } from '@/shared/ui/components/input';
import {
  renameListAction,
  deleteListAction,
  createTaskAction,
  toggleTaskDoneAction,
  updateTaskAction,
  deleteTaskAction,
  moveTaskAction,
} from './actions';
import { DeleteListButton } from './delete-list-button';
import { TaskRow } from './task-row';

interface Task {
  id: string;
  title: string;
  done: boolean;
  dueDate: string | null;
}

interface ListDetail {
  id: string;
  title: string;
  tasks: Task[];
}

interface ListDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ListDetailPage({ params }: ListDetailPageProps) {
  const { id } = await params;
  const t = await getTranslations('Lists');
  const tTasks = await getTranslations('Tasks');

  let list: ListDetail;
  try {
    const data = await graphqlFetch<{ list: ListDetail }>(
      `query ListDetail($id: ID!) { list(id: $id) { id title tasks { id title done dueDate } } }`,
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
  const createTaskWithId = createTaskAction.bind(null, id);
  const moveTaskInList = moveTaskAction.bind(null, id);

  const taskRowLabels = {
    editButton: tTasks('editButton'),
    deleteButton: tTasks('deleteButton'),
    deleteConfirm: tTasks('deleteConfirm'),
    saveButton: tTasks('saveButton'),
    cancelButton: tTasks('cancelButton'),
    moveUp: tTasks('moveUp'),
    moveDown: tTasks('moveDown'),
    dueDateLabel: tTasks('dueDateLabel'),
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-8">
      <Link
        href="/"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← {t('backToLists')}
      </Link>

      <form action={renameWithId} className="flex gap-2">
        <Input
          name="title"
          defaultValue={list.title}
          required
          className="text-xl font-semibold"
        />
        <Button type="submit">{t('saveButton')}</Button>
      </form>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          {tTasks('title')}
        </h2>

        <form action={createTaskWithId} className="flex gap-2">
          <Input
            name="title"
            placeholder={tTasks('createPlaceholder')}
            required
          />
          <Button type="submit">{tTasks('addButton')}</Button>
        </form>

        {list.tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {tTasks('emptyState')}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {list.tasks.map((task, index) => (
              <TaskRow
                key={task.id}
                task={task}
                isFirst={index === 0}
                isLast={index === list.tasks.length - 1}
                labels={taskRowLabels}
                onToggleDone={toggleTaskDoneAction}
                onUpdate={updateTaskAction}
                onDelete={deleteTaskAction}
                onMove={moveTaskInList}
              />
            ))}
          </ul>
        )}
      </section>

      <DeleteListButton
        action={deleteWithId}
        label={t('deleteButton')}
        confirmMessage={t('deleteConfirm')}
      />
    </div>
  );
}
