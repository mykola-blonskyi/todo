import { getTranslations } from 'next-intl/server';
import { Link } from '@shared/lib/i18n/navigation';
import { Button } from '@/shared/ui/components/button';
import { Input } from '@/shared/ui/components/input';
import { Badge } from '@/shared/ui/components/badge';
import { ShareSearch, CollaboratorsList } from '@features/list-sharing';
import {
  renameListAction,
  deleteListAction,
  createTaskAction,
  toggleTaskDoneAction,
  updateTaskAction,
  deleteTaskAction,
  moveTaskAction,
} from './actions';
import { DeleteListButton } from './DeleteListButton';
import { TaskRow } from './TaskRow';
import type { ListDetailData } from './types';

interface ListDetailProps {
  list: ListDetailData;
  myUserId: string;
}

export async function ListDetail({ list, myUserId }: ListDetailProps) {
  const t = await getTranslations('Lists');
  const tTasks = await getTranslations('Tasks');
  const tSharing = await getTranslations('Sharing');

  const renameWithId = renameListAction.bind(null, list.id);
  const deleteWithId = deleteListAction.bind(null, list.id);
  const createTaskWithId = createTaskAction.bind(null, list.id);
  const moveTaskInList = moveTaskAction.bind(null, list.id);

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

      {list.templateId ? (
        <Badge variant="secondary" className="self-start">
          {t('generatedFromTemplate')}
        </Badge>
      ) : null}

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

      {list.isOwner ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            {tSharing('title')}
          </h2>
          <ShareSearch listId={list.id} />
        </section>
      ) : null}

      <CollaboratorsList
        listId={list.id}
        collaborators={list.collaborators}
        isOwner={list.isOwner}
        myUserId={myUserId}
      />

      <DeleteListButton
        action={deleteWithId}
        label={t('deleteButton')}
        confirmMessage={t('deleteConfirm')}
      />
    </div>
  );
}
