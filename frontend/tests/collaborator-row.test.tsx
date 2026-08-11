import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from './setup/render';
import { CollaboratorRow } from '@/features/list-sharing/CollaboratorRow';
import {
  removeCollaboratorAction,
  leaveListAction,
} from '@/features/list-sharing/actions';

vi.mock('@/features/list-sharing/actions', () => ({
  removeCollaboratorAction: vi.fn(),
  leaveListAction: vi.fn(),
}));

const collaborator = {
  id: 'user-2',
  email: 'friend@example.com',
  name: 'Friend',
  image: null,
};

describe('CollaboratorRow', () => {
  it('renders the collaborator name and email', () => {
    renderWithIntl(
      <CollaboratorRow
        listId="list-1"
        collaborator={collaborator}
        isOwnerView={false}
        isSelf={false}
      />,
    );

    expect(screen.getByText('Friend')).toBeInTheDocument();
    expect(screen.getByText('friend@example.com')).toBeInTheDocument();
  });

  it('shows a Remove action for the owner and calls removeCollaboratorAction', async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <CollaboratorRow
        listId="list-1"
        collaborator={collaborator}
        isOwnerView
        isSelf={false}
      />,
    );

    expect(
      screen.queryByRole('button', { name: 'Leave' }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove' }));

    expect(removeCollaboratorAction).toHaveBeenCalledWith('list-1', 'user-2');
  });

  it('shows a Leave action for the acting collaborator and calls leaveListAction', async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <CollaboratorRow
        listId="list-1"
        collaborator={collaborator}
        isOwnerView={false}
        isSelf
      />,
    );

    expect(
      screen.queryByRole('button', { name: 'Remove' }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Leave' }));

    expect(leaveListAction).toHaveBeenCalledWith('list-1');
  });

  it('shows no action for another collaborator viewed by a non-owner', () => {
    renderWithIntl(
      <CollaboratorRow
        listId="list-1"
        collaborator={collaborator}
        isOwnerView={false}
        isSelf={false}
      />,
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
