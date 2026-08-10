import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from './setup/render';
import { PendingInviteRow } from '@/features/list-sharing/PendingInviteRow';
import {
  acceptInviteAction,
  declineInviteAction,
} from '@/features/list-sharing/actions';

vi.mock('@/features/list-sharing/actions', () => ({
  acceptInviteAction: vi.fn(),
  declineInviteAction: vi.fn(),
}));

const invite = {
  id: 'share-1',
  invitedAt: '2026-08-10T00:00:00.000Z',
  list: { id: 'list-1', title: 'Shared List' },
};

describe('PendingInviteRow', () => {
  it('renders the list title with Accept and Decline actions', () => {
    renderWithIntl(<PendingInviteRow invite={invite} />);

    expect(screen.getByText('Shared List')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Decline' })).toBeInTheDocument();
  });

  it('calls acceptInviteAction with the share id when Accept is clicked', async () => {
    const user = userEvent.setup();
    renderWithIntl(<PendingInviteRow invite={invite} />);

    await user.click(screen.getByRole('button', { name: 'Accept' }));

    expect(acceptInviteAction).toHaveBeenCalledWith('share-1');
  });

  it('calls declineInviteAction with the share id when Decline is clicked', async () => {
    const user = userEvent.setup();
    renderWithIntl(<PendingInviteRow invite={invite} />);

    await user.click(screen.getByRole('button', { name: 'Decline' }));

    expect(declineInviteAction).toHaveBeenCalledWith('share-1');
  });
});
