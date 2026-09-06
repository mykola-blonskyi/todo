'use client';

import { useState, useTransition } from 'react';
import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/shared/ui/components/button';
import { Checkbox } from '@/shared/ui/components/checkbox';
import { Input } from '@/shared/ui/components/input';
import { CommentThread, TaskCommentsToggle } from '@features/comments';
import type { Task } from './types';

interface TaskRowLabels {
  editButton: string;
  deleteButton: string;
  deleteConfirm: string;
  saveButton: string;
  cancelButton: string;
  moveUp: string;
  moveDown: string;
  dueDateLabel: string;
}

interface TaskRowProps {
  task: Task;
  isFirst: boolean;
  isLast: boolean;
  labels: TaskRowLabels;
  onToggleDone: (id: string) => Promise<void>;
  onUpdate: (
    id: string,
    title: string,
    dueDate: string | null,
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onMove: (id: string, direction: 'up' | 'down') => Promise<void>;
  onAddComment: (id: string, formData: FormData) => Promise<void>;
}

export function TaskRow({
  task,
  isFirst,
  isLast,
  labels,
  onToggleDone,
  onUpdate,
  onDelete,
  onMove,
  onAddComment,
}: TaskRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (isEditing) {
    return (
      <li>
        <form
          className="flex flex-wrap items-center gap-2"
          action={(formData: FormData) => {
            const title = formData.get('title');
            const dueDate = formData.get('dueDate');
            startTransition(async () => {
              await onUpdate(
                task.id,
                typeof title === 'string' ? title : task.title,
                typeof dueDate === 'string' && dueDate ? dueDate : null,
              );
              setIsEditing(false);
            });
          }}
        >
          <Input
            name="title"
            defaultValue={task.title}
            required
            className="flex-1"
          />
          <Input
            name="dueDate"
            type="date"
            defaultValue={task.dueDate ? task.dueDate.slice(0, 10) : ''}
            className="w-40"
          />
          <Button type="submit" size="sm" disabled={isPending}>
            {labels.saveButton}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => setIsEditing(false)}
          >
            {labels.cancelButton}
          </Button>
        </form>
      </li>
    );
  }

  return (
    <li
      data-tui-row=""
      tabIndex={-1}
      className="group relative flex flex-col gap-1 rounded-md px-1 py-1 transition-colors hover:bg-muted/60 focus:bg-accent focus:outline-none"
    >
      <div className="flex items-center gap-3">
        <Checkbox
          checked={task.done}
          disabled={isPending}
          aria-label={task.title}
          onCheckedChange={() => {
            startTransition(() => {
              void onToggleDone(task.id);
            });
          }}
        />
        <span
          className={
            task.done
              ? 'min-w-0 flex-1 text-muted-foreground line-through'
              : 'min-w-0 flex-1'
          }
        >
          {task.title}
          {task.dueDate ? (
            <span className="ml-2 whitespace-nowrap text-xs text-muted-foreground">
              {labels.dueDateLabel} {task.dueDate.slice(0, 10)}
            </span>
          ) : null}
        </span>
        {/* Secondary actions stay out of the way until the row is hovered or
            focused (always visible on touch, where there is no hover). A
            comment count is the one thing that stays visible: it is
            information, not just an action. */}
        <div className="flex shrink-0 items-center gap-0.5">
          <TaskCommentsToggle
            count={task.comments.length}
            isOpen={commentsOpen}
            onToggle={() => setCommentsOpen((open) => !open)}
            className={
              task.comments.length > 0 || commentsOpen
                ? undefined
                : 'opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100'
            }
          />
          {/* Pointer devices: an overlay at the row's end, revealed on
              hover/focus, so the title keeps its full width. Touch devices:
              always visible, in flow. */}
          <div className="flex items-center gap-0.5 [@media(hover:hover)]:absolute [@media(hover:hover)]:right-1 [@media(hover:hover)]:top-1 [@media(hover:hover)]:rounded-md [@media(hover:hover)]:bg-muted [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:transition-opacity [@media(hover:hover)]:focus-within:opacity-100 [@media(hover:hover)]:group-hover:opacity-100">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 px-0"
              data-action="move-up"
              disabled={isFirst || isPending}
              onClick={() => startTransition(() => void onMove(task.id, 'up'))}
            >
              <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">{labels.moveUp}</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 px-0"
              data-action="move-down"
              disabled={isLast || isPending}
              onClick={() =>
                startTransition(() => void onMove(task.id, 'down'))
              }
            >
              <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">{labels.moveDown}</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 px-0"
              data-action="edit"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">{labels.editButton}</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 px-0 text-muted-foreground hover:text-destructive"
              data-action="delete"
              disabled={isPending}
              onClick={() => {
                if (window.confirm(labels.deleteConfirm)) {
                  startTransition(() => void onDelete(task.id));
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">{labels.deleteButton}</span>
            </Button>
          </div>
        </div>
      </div>
      {commentsOpen ? (
        <div className="pl-7 pr-1">
          <CommentThread
            comments={task.comments}
            onSubmit={(formData) => onAddComment(task.id, formData)}
          />
        </div>
      ) : null}
    </li>
  );
}
