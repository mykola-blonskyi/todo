import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithIntl } from './setup/render';
import { PendingInvites } from '@/features/list-sharing/PendingInvites';

vi.mock('@/features/list-sharing/actions', () => ({
  acceptInviteAction: vi.fn(),
  declineInviteAction: vi.fn(),
}));

describe('PendingInvites', () => {
  it('renders nothing when there are no pending invites', () => {
    // useTranslations() is called unconditionally before the early return,
    // so this still needs the intl provider even though nothing renders.
    const { container } = renderWithIntl(<PendingInvites invites={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders a heading and a row per pending invite', () => {
    renderWithIntl(
      <PendingInvites
        invites={[
          {
            id: 'share-1',
            invitedAt: '2026-08-10T00:00:00.000Z',
            list: { id: 'list-1', title: 'Groceries' },
          },
          {
            id: 'share-2',
            invitedAt: '2026-08-10T00:00:00.000Z',
            list: { id: 'list-2', title: 'Chores' },
          },
        ]}
      />,
    );

    expect(screen.getByText('Pending invites')).toBeInTheDocument();
    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('Chores')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Accept' })).toHaveLength(2);
  });
});
