'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';

interface Task {
  id: string;
  title: string;
  done: boolean;
  dueDate: string | null;
}

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
  onUpdate: (id: string, title: string, dueDate: string | null) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onMove: (id: string, direction: 'up' | 'down') => Promise<void>;
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
}: TaskRowProps) {
  const [isEditing, setIsEditing] = useState(false);
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
          <Input name="title" defaultValue={task.title} required className="flex-1" />
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
    <li className="flex items-center gap-3">
      <Checkbox
        checked={task.done}
        disabled={isPending}
        onCheckedChange={() => {
          startTransition(() => {
            void onToggleDone(task.id);
          });
        }}
      />
      <span className={task.done ? 'flex-1 text-muted-foreground line-through' : 'flex-1'}>
        {task.title}
        {task.dueDate ? (
          <span className="ml-2 text-xs text-muted-foreground">
            {labels.dueDateLabel} {task.dueDate.slice(0, 10)}
          </span>
        ) : null}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={isFirst || isPending}
        onClick={() => startTransition(() => void onMove(task.id, 'up'))}
      >
        ↑<span className="sr-only">{labels.moveUp}</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={isLast || isPending}
        onClick={() => startTransition(() => void onMove(task.id, 'down'))}
      >
        ↓<span className="sr-only">{labels.moveDown}</span>
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
        {labels.editButton}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={isPending}
        onClick={() => {
          if (window.confirm(labels.deleteConfirm)) {
            startTransition(() => void onDelete(task.id));
          }
        }}
      >
        {labels.deleteButton}
      </Button>
    </li>
  );
}
