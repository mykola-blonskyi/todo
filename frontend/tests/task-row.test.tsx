import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from './setup/render';
import { TaskRow } from '@/features/todo-list/TaskRow';
import type { Task } from '@/features/todo-list/types';

const labels = {
  editButton: 'Edit',
  deleteButton: 'Delete',
  deleteConfirm: 'Delete this task?',
  saveButton: 'Save',
  cancelButton: 'Cancel',
  moveUp: 'Move up',
  moveDown: 'Move down',
  dueDateLabel: 'Due',
};

const task: Task = {
  id: 'task-1',
  title: 'Buy milk',
  done: false,
  dueDate: null,
  comments: [],
};

function renderTaskRow(overrides: Partial<Task> = {}) {
  const onToggleDone = vi.fn().mockResolvedValue(undefined);
  const onUpdate = vi.fn().mockResolvedValue(undefined);
  const onDelete = vi.fn().mockResolvedValue(undefined);
  const onMove = vi.fn().mockResolvedValue(undefined);
  const onAddComment = vi.fn().mockResolvedValue(undefined);

  renderWithIntl(
    <TaskRow
      task={{ ...task, ...overrides }}
      isFirst={false}
      isLast={false}
      labels={labels}
      onToggleDone={onToggleDone}
      onUpdate={onUpdate}
      onDelete={onDelete}
      onMove={onMove}
      onAddComment={onAddComment}
    />,
  );

  return { onToggleDone, onUpdate, onDelete, onMove, onAddComment };
}

describe('TaskRow', () => {
  it('renders the task title and due date when present', () => {
    renderTaskRow({ dueDate: '2026-08-15T00:00:00.000Z' });

    expect(screen.getByText('Buy milk')).toBeInTheDocument();
    expect(screen.getByText(/Due 2026-08-15/)).toBeInTheDocument();
  });

  it('calls onToggleDone with the task id when the checkbox is clicked', async () => {
    const user = userEvent.setup();
    const { onToggleDone } = renderTaskRow();

    await user.click(screen.getByRole('checkbox'));

    expect(onToggleDone).toHaveBeenCalledWith('task-1');
  });

  it('calls onMove with the direction when an enabled move button is clicked', async () => {
    const user = userEvent.setup();
    const { onMove } = renderTaskRow();

    await user.click(screen.getByRole('button', { name: /Move up/ }));
    expect(onMove).toHaveBeenCalledWith('task-1', 'up');

    await user.click(screen.getByRole('button', { name: /Move down/ }));
    expect(onMove).toHaveBeenCalledWith('task-1', 'down');
  });

  it('disables move up when isFirst and move down when isLast', () => {
    const onToggleDone = vi.fn();
    const onUpdate = vi.fn();
    const onDelete = vi.fn();
    const onMove = vi.fn();
    const onAddComment = vi.fn();

    renderWithIntl(
      <TaskRow
        task={task}
        isFirst
        isLast
        labels={labels}
        onToggleDone={onToggleDone}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onMove={onMove}
        onAddComment={onAddComment}
      />,
    );

    expect(screen.getByRole('button', { name: /Move up/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Move down/ })).toBeDisabled();
  });

  it('switches to edit mode and submits the updated title', async () => {
    const user = userEvent.setup();
    const { onUpdate } = renderTaskRow();

    await user.click(screen.getByRole('button', { name: 'Edit' }));

    const titleInput = screen.getByDisplayValue('Buy milk');
    await user.clear(titleInput);
    await user.type(titleInput, 'Buy oat milk');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onUpdate).toHaveBeenCalledWith('task-1', 'Buy oat milk', null);
  });

  it('deletes the task only when the confirm dialog is accepted', async () => {
    const user = userEvent.setup();
    const { onDelete } = renderTaskRow();
    const confirmSpy = vi.spyOn(window, 'confirm');

    confirmSpy.mockReturnValueOnce(false);
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDelete).not.toHaveBeenCalled();

    confirmSpy.mockReturnValueOnce(true);
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledWith('task-1');

    confirmSpy.mockRestore();
  });

  it('toggles the comment thread and submits a new comment for the task', async () => {
    const user = userEvent.setup();
    const { onAddComment } = renderTaskRow({
      comments: [
        {
          id: 'comment-1',
          body: 'Get 2%',
          createdAt: '2026-08-14T00:00:00.000Z',
          author: { id: 'user-1', email: 'a@example.com', name: 'A' },
        },
      ],
    });

    expect(screen.queryByText('Get 2%')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Comments (1)' }));
    expect(screen.getByText('Get 2%')).toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText('Write a comment...'),
      'New comment',
    );
    await user.click(screen.getByRole('button', { name: 'Post' }));

    expect(onAddComment).toHaveBeenCalledWith('task-1', expect.any(FormData));
  });
});
