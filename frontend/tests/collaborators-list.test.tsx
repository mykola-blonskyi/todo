import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithIntl } from './setup/render';
import { CollaboratorsList } from '@/features/list-sharing/CollaboratorsList';

vi.mock('@/features/list-sharing/actions', () => ({
  removeCollaboratorAction: vi.fn(),
  leaveListAction: vi.fn(),
}));

describe('CollaboratorsList', () => {
  it('renders nothing when there are no collaborators', () => {
    // useTranslations() runs before the early return, so this still needs
    // the intl provider even though nothing renders.
    const { container } = renderWithIntl(
      <CollaboratorsList
        listId="list-1"
        collaborators={[]}
        isOwner
        myUserId="user-1"
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders a heading and a row per collaborator, gated correctly per viewer', () => {
    renderWithIntl(
      <CollaboratorsList
        listId="list-1"
        collaborators={[
          {
            id: 'user-2',
            email: 'friend@example.com',
            name: 'Friend',
            image: null,
          },
          {
            id: 'user-3',
            email: 'other@example.com',
            name: 'Other',
            image: null,
          },
        ]}
        isOwner={false}
        myUserId="user-2"
      />,
    );

    expect(screen.getByText('Collaborators')).toBeInTheDocument();
    expect(screen.getByText('Friend')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
    // Only the acting user's own row gets a Leave action.
    expect(screen.getAllByRole('button', { name: 'Leave' })).toHaveLength(1);
    expect(
      screen.queryByRole('button', { name: 'Remove' }),
    ).not.toBeInTheDocument();
  });

  it('gives the owner a Remove action on every row', () => {
    renderWithIntl(
      <CollaboratorsList
        listId="list-1"
        collaborators={[
          {
            id: 'user-2',
            email: 'friend@example.com',
            name: 'Friend',
            image: null,
          },
          {
            id: 'user-3',
            email: 'other@example.com',
            name: 'Other',
            image: null,
          },
        ]}
        isOwner
        myUserId="owner-id"
      />,
    );

    expect(screen.getAllByRole('button', { name: 'Remove' })).toHaveLength(2);
    expect(
      screen.queryByRole('button', { name: 'Leave' }),
    ).not.toBeInTheDocument();
  });
});
