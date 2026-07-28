import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { graphqlFetch, GraphQLRequestError } from '@/lib/graphql-client';
import { Link } from '@/lib/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  renameListAction,
  deleteListAction,
  createTaskAction,
  toggleTaskDoneAction,
} from './actions';
import { DeleteListButton } from './delete-list-button';
import { TaskToggle } from './task-toggle';

interface Task {
  id: string;
  title: string;
  done: boolean;
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
      `query ListDetail($id: ID!) { list(id: $id) { id title tasks { id title done } } }`,
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

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-8">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← {t('backToLists')}
      </Link>

      <form action={renameWithId} className="flex gap-2">
        <Input name="title" defaultValue={list.title} required className="text-xl font-semibold" />
        <Button type="submit">{t('saveButton')}</Button>
      </form>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">{tTasks('title')}</h2>

        <form action={createTaskWithId} className="flex gap-2">
          <Input name="title" placeholder={tTasks('createPlaceholder')} required />
          <Button type="submit">{tTasks('addButton')}</Button>
        </form>

        {list.tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tTasks('emptyState')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {list.tasks.map((task) => (
              <li key={task.id} className="flex items-center gap-3">
                <TaskToggle taskId={task.id} done={task.done} action={toggleTaskDoneAction} />
                <span className={task.done ? 'text-muted-foreground line-through' : undefined}>
                  {task.title}
                </span>
              </li>
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
