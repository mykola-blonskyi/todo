import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@ui/components/button';
import { Input } from '@ui/components/input';
import { Label } from '@ui/components/label';
import { Badge } from '@ui/components/badge';
import { cn } from '@shared/lib/utils';
import { formatOccurrenceDate } from '@shared/lib/dates';
import { ShareSearch, CollaboratorsList } from '@features/list-sharing';
import {
  CommentThread,
  addListCommentAction,
  addTaskCommentAction,
} from '@features/comments';
import { SyncToCalendarButton } from '@features/google-calendar';
import type { Category } from '@features/categories';
import {
  renameListAction,
  updateListDueDateAction,
  deleteListAction,
  createTaskAction,
  toggleTaskDoneAction,
  updateTaskAction,
  deleteTaskAction,
  moveTaskAction,
} from './actions';
import { DeleteListButton } from './DeleteListButton';
import { TaskRow } from './TaskRow';
import { CategoryAssign } from './CategoryAssign';
import type { ListDetailData } from './types';

// The List detail page, decomposed into blocks every layout composes in its
// own arrangement (three-pane, drawer, notebook page, table row...). All
// sync Server Components - `useTranslations` works there - so the layouts
// can place them freely and tests can render them.

interface BlockProps {
  list: ListDetailData;
  className?: string;
}

export function ListTitleForm({
  list,
  className,
  inputClassName,
}: BlockProps & { inputClassName?: string }) {
  const t = useTranslations('Lists');
  const renameWithId = renameListAction.bind(null, list.id);
  return (
    <form action={renameWithId} className={cn('flex gap-2', className)}>
      <Input
        name="title"
        defaultValue={list.title}
        required
        aria-label={t('titleLabel')}
        className={cn('text-xl font-semibold', inputClassName)}
      />
      <Button type="submit">{t('saveButton')}</Button>
    </form>
  );
}

export function ListDueDateForm({ list, className }: BlockProps) {
  const t = useTranslations('Lists');
  const updateDueDateWithId = updateListDueDateAction.bind(null, list.id);
  return (
    <form
      action={updateDueDateWithId}
      className={cn('flex flex-wrap items-center gap-2', className)}
    >
      <Label htmlFor="list-due-date" className="text-sm text-muted-foreground">
        {t('dueDateLabel')}
      </Label>
      <Input
        id="list-due-date"
        name="dueDate"
        type="date"
        defaultValue={list.dueDate ? list.dueDate.slice(0, 10) : ''}
        className="w-40"
      />
      <Button type="submit" size="sm" variant="outline">
        {t('saveButton')}
      </Button>
    </form>
  );
}

interface ListMetaProps extends BlockProps {
  categories: Category[];
  googleCalendarConnected: boolean;
}

// Category · calendar sync · "generated from template" badge - the row of
// secondary facts about a list.
export function ListMetaControls({
  list,
  categories,
  googleCalendarConnected,
  className,
}: ListMetaProps) {
  const t = useTranslations('Lists');
  const locale = useLocale();
  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      <CategoryAssign
        listId={list.id}
        myCategory={list.myCategory}
        categories={categories}
      />
      {googleCalendarConnected ? (
        <SyncToCalendarButton listId={list.id} />
      ) : null}
      {list.templateId ? (
        <Badge variant="secondary">
          {t('generatedFromTemplate')} ·{' '}
          {formatOccurrenceDate(list.createdAt, locale)}
        </Badge>
      ) : null}
    </div>
  );
}

interface TaskSectionProps extends BlockProps {
  showHeading?: boolean;
  headingClassName?: string;
  listClassName?: string;
}

export function TaskSection({
  list,
  className,
  showHeading = true,
  headingClassName,
  listClassName,
}: TaskSectionProps) {
  const tTasks = useTranslations('Tasks');
  const createTaskWithId = createTaskAction.bind(null, list.id);

  const taskRowLabels = {
    editButton: tTasks('editButton'),
    deleteButton: tTasks('deleteButton'),
    deleteConfirm: tTasks('deleteConfirm'),
    saveButton: tTasks('saveButton'),
    cancelButton: tTasks('cancelButton'),
    moveUp: tTasks('moveUp'),
    moveDown: tTasks('moveDown'),
    dueDateLabel: tTasks('dueDateLabel'),
    editTitleLabel: (title: string) => tTasks('editTitleLabel', { title }),
    editDueDateLabel: (title: string) => tTasks('editDueDateLabel', { title }),
  };

  return (
    <section className={cn('flex flex-col gap-3', className)}>
      {showHeading ? (
        <h2
          className={cn(
            'text-sm font-medium text-muted-foreground',
            headingClassName,
          )}
        >
          {tTasks('title')}
        </h2>
      ) : null}

      <form action={createTaskWithId} className="flex gap-2">
        <Input
          name="title"
          placeholder={tTasks('createPlaceholder')}
          aria-label={tTasks('createPlaceholder')}
          required
        />
        <Button type="submit">{tTasks('addButton')}</Button>
      </form>

      {list.tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tTasks('emptyState')}</p>
      ) : (
        <ul className={cn('flex flex-col gap-2', listClassName)}>
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
              onMove={moveTaskAction}
              onAddComment={addTaskCommentAction}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

export function ListCommentsSection({
  list,
  className,
  showHeading = true,
  headingClassName,
}: TaskSectionProps) {
  const tComments = useTranslations('Comments');
  const addListComment = addListCommentAction.bind(null, list.id);
  return (
    <section className={cn('flex flex-col gap-3', className)}>
      {showHeading ? (
        <h2
          className={cn(
            'text-sm font-medium text-muted-foreground',
            headingClassName,
          )}
        >
          {tComments('title')}
        </h2>
      ) : null}
      <CommentThread comments={list.comments} onSubmit={addListComment} />
    </section>
  );
}

interface SharingProps extends TaskSectionProps {
  myUserId: string;
}

export function ListSharingSection({
  list,
  myUserId,
  className,
  showHeading = true,
  headingClassName,
}: SharingProps) {
  const tSharing = useTranslations('Sharing');
  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {list.isOwner ? (
        <section className="flex flex-col gap-3">
          {showHeading ? (
            <h2
              className={cn(
                'text-sm font-medium text-muted-foreground',
                headingClassName,
              )}
            >
              {tSharing('title')}
            </h2>
          ) : null}
          <ShareSearch listId={list.id} />
        </section>
      ) : null}
      <CollaboratorsList
        listId={list.id}
        collaborators={list.collaborators}
        isOwner={list.isOwner}
        myUserId={myUserId}
      />
    </div>
  );
}

export function DeleteListControl({ list, className }: BlockProps) {
  const t = useTranslations('Lists');
  const deleteWithId = deleteListAction.bind(null, list.id);
  return (
    <div className={className}>
      <DeleteListButton
        action={deleteWithId}
        label={t('deleteButton')}
        confirmMessage={t('deleteConfirm')}
      />
    </div>
  );
}
