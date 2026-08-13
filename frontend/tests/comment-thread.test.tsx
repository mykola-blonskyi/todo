import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from './setup/render';
import { CommentThread } from '@/features/comments/CommentThread';
import type { Comment } from '@/features/comments/types';

describe('CommentThread', () => {
  it('shows an empty state when there are no comments', () => {
    renderWithIntl(<CommentThread comments={[]} onSubmit={vi.fn()} />);

    expect(screen.getByText('No comments yet.')).toBeInTheDocument();
  });

  it('renders each comment with its author', () => {
    const comments: Comment[] = [
      {
        id: 'comment-1',
        body: 'Nice list',
        createdAt: '2026-08-14T00:00:00.000Z',
        author: { id: 'user-1', email: 'a@example.com', name: 'Alice' },
      },
      {
        id: 'comment-2',
        body: 'Thanks',
        createdAt: '2026-08-14T01:00:00.000Z',
        author: { id: 'user-2', email: 'b@example.com', name: null },
      },
    ];

    renderWithIntl(<CommentThread comments={comments} onSubmit={vi.fn()} />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Nice list')).toBeInTheDocument();
    // Falls back to email when the author has no name set.
    expect(screen.getByText('b@example.com')).toBeInTheDocument();
    expect(screen.getByText('Thanks')).toBeInTheDocument();
  });

  it('submits the entered body via onSubmit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    renderWithIntl(<CommentThread comments={[]} onSubmit={onSubmit} />);

    await user.type(
      screen.getByPlaceholderText('Write a comment...'),
      'Hello there',
    );
    await user.click(screen.getByRole('button', { name: 'Post' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const formData = onSubmit.mock.calls[0][0] as FormData;
    expect(formData.get('body')).toBe('Hello there');
  });
});
