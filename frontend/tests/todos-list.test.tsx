import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithIntl } from './setup/render';
import { TodosList } from '@/features/todos-list/TodosList';

vi.mock('@/features/todos-list/actions', () => ({
  createListAction: vi.fn(),
}));

vi.mock('@/features/list-sharing/actions', () => ({
  acceptInviteAction: vi.fn(),
  declineInviteAction: vi.fn(),
}));

describe('TodosList', () => {
  it('shows the empty state when there are no lists', () => {
    renderWithIntl(
      <TodosList lists={[]} pendingInvites={[]} categories={[]} />,
    );

    expect(
      screen.getByText('No lists yet. Create one above to get started.'),
    ).toBeInTheDocument();
  });

  it('renders a link for each list', () => {
    renderWithIntl(
      <TodosList
        lists={[
          { id: 'list-1', title: 'Groceries' },
          { id: 'list-2', title: 'Chores' },
        ]}
        pendingInvites={[]}
        categories={[]}
      />,
    );

    expect(screen.getByRole('link', { name: 'Groceries' })).toHaveAttribute(
      'href',
      '/lists/list-1',
    );
    expect(screen.getByRole('link', { name: 'Chores' })).toHaveAttribute(
      'href',
      '/lists/list-2',
    );
  });

  it('does not render a pending invites section when there are none', () => {
    renderWithIntl(
      <TodosList lists={[]} pendingInvites={[]} categories={[]} />,
    );

    expect(screen.queryByText('Pending invites')).not.toBeInTheDocument();
  });

  it('renders pending invites above the lists section', () => {
    renderWithIntl(
      <TodosList
        lists={[]}
        pendingInvites={[
          {
            id: 'share-1',
            invitedAt: '2026-08-10T00:00:00.000Z',
            list: { id: 'list-3', title: 'Shared List' },
          },
        ]}
        categories={[]}
      />,
    );

    expect(screen.getByText('Pending invites')).toBeInTheDocument();
    expect(screen.getByText('Shared List')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Decline' })).toBeInTheDocument();
  });
});
