import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './setup/render';
import { ShareSearch } from '@/features/list-sharing/ShareSearch';
import {
  searchShareCandidatesAction,
  inviteToListAction,
} from '@/features/list-sharing/actions';

vi.mock('@/features/list-sharing/actions', () => ({
  searchShareCandidatesAction: vi.fn(),
  inviteToListAction: vi.fn(),
}));

const searchMock = vi.mocked(searchShareCandidatesAction);
const inviteMock = vi.mocked(inviteToListAction);

describe('ShareSearch', () => {
  it('renders the search input', () => {
    renderWithProviders(<ShareSearch listId="list-1" />);

    expect(
      screen.getByPlaceholderText('Search by name or email'),
    ).toBeInTheDocument();
  });

  it('searches (debounced) and renders results once typing settles', async () => {
    searchMock.mockResolvedValue([
      {
        hubUserId: 'user-2',
        email: 'friend@example.com',
        name: 'Friend',
        image: null,
      },
    ]);
    const user = userEvent.setup();
    renderWithProviders(<ShareSearch listId="list-1" />);

    await user.type(
      screen.getByPlaceholderText('Search by name or email'),
      'fri',
    );

    await waitFor(() => {
      expect(searchMock).toHaveBeenCalledWith('list-1', 'fri');
    });
    expect(await screen.findByText('Friend')).toBeInTheDocument();
    expect(screen.getByText('friend@example.com')).toBeInTheDocument();
  });

  it('shows a no-results message when the search comes back empty', async () => {
    searchMock.mockResolvedValue([]);
    const user = userEvent.setup();
    renderWithProviders(<ShareSearch listId="list-1" />);

    await user.type(
      screen.getByPlaceholderText('Search by name or email'),
      'nobody',
    );

    expect(
      await screen.findByText('No matches for “nobody”'),
    ).toBeInTheDocument();
  });

  it('shows an error message when the search fails', async () => {
    searchMock.mockRejectedValue(
      new Error('hub project-members search failed: 401'),
    );
    const user = userEvent.setup();
    renderWithProviders(<ShareSearch listId="list-1" />);

    await user.type(
      screen.getByPlaceholderText('Search by name or email'),
      'fri',
    );

    expect(
      await screen.findByText(
        "Couldn't search right now. Try again in a moment.",
      ),
    ).toBeInTheDocument();
  });

  it('invites the selected candidate', async () => {
    searchMock.mockResolvedValue([
      {
        hubUserId: 'user-2',
        email: 'friend@example.com',
        name: 'Friend',
        image: null,
      },
    ]);
    inviteMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderWithProviders(<ShareSearch listId="list-1" />);

    await user.type(
      screen.getByPlaceholderText('Search by name or email'),
      'fri',
    );
    const result = await screen.findByText('Friend');
    await user.click(result);

    await waitFor(() => {
      expect(inviteMock).toHaveBeenCalledWith('list-1', {
        hubUserId: 'user-2',
        email: 'friend@example.com',
        name: 'Friend',
        image: null,
      });
    });
  });

  it('confirms the invite where the dropdown it closed cannot hide it', async () => {
    searchMock.mockResolvedValue([
      {
        hubUserId: 'user-2',
        email: 'friend@example.com',
        name: 'Friend',
        image: null,
      },
    ]);
    inviteMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderWithProviders(<ShareSearch listId="list-1" />);

    await user.type(
      screen.getByPlaceholderText('Search by name or email'),
      'fri',
    );
    await user.click(await screen.findByText('Friend'));

    expect(await screen.findByText('Invited Friend')).toBeInTheDocument();
  });

  it('says so when the invite fails, rather than looking like nothing happened', async () => {
    searchMock.mockResolvedValue([
      {
        hubUserId: 'user-2',
        email: 'friend@example.com',
        name: 'Friend',
        image: null,
      },
    ]);
    inviteMock.mockRejectedValue(new Error('nope'));
    const user = userEvent.setup();
    renderWithProviders(<ShareSearch listId="list-1" />);

    await user.type(
      screen.getByPlaceholderText('Search by name or email'),
      'fri',
    );
    await user.click(await screen.findByText('Friend'));

    expect(
      await screen.findByText(
        "Couldn't send that invite. Try again in a moment.",
      ),
    ).toBeInTheDocument();
  });
});
