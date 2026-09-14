import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from './setup/render';
import { CommentThread } from '@/features/comments/CommentThread';
import type { Comment } from '@/features/comments/types';

describe('CommentThread', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows an empty state when there are no comments', () => {
    renderWithIntl(<CommentThread comments={[]} onSubmit={vi.fn()} />);

    expect(screen.getByText('No comments yet.')).toBeInTheDocument();
  });

  it('renders each comment with its author and when it was posted', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-14T02:00:00.000Z'));
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
    expect(screen.getByText('2 hours ago')).toBeInTheDocument();
    // Falls back to email when the author has no name set.
    expect(screen.getByText('b@example.com')).toBeInTheDocument();
    expect(screen.getByText('Thanks')).toBeInTheDocument();
    expect(screen.getByText('1 hour ago')).toBeInTheDocument();
  });

  it('names the comment input and submits the entered body via onSubmit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    renderWithIntl(<CommentThread comments={[]} onSubmit={onSubmit} />);

    const input = screen.getByRole('textbox', { name: 'Write a comment...' });
    await user.type(input, 'Hello there');
    await user.click(screen.getByRole('button', { name: 'Post' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const formData = onSubmit.mock.calls[0][0] as FormData;
    expect(formData.get('body')).toBe('Hello there');
  });

  it('announces once a comment is posted', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    renderWithIntl(<CommentThread comments={[]} onSubmit={onSubmit} />);

    expect(screen.getByRole('status')).toHaveTextContent('');

    await user.type(
      screen.getByPlaceholderText('Write a comment...'),
      'Hello there',
    );
    await user.click(screen.getByRole('button', { name: 'Post' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Comment posted.',
    );
  });
});
