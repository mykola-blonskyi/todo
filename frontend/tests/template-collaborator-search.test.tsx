import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './setup/render';
import { TemplateCollaboratorSearch } from '@/features/list-templates/TemplateCollaboratorSearch';
import {
  searchTemplateCandidatesAction,
  addTemplateCollaboratorAction,
} from '@/features/list-templates/actions';

vi.mock('@/features/list-templates/actions', () => ({
  searchTemplateCandidatesAction: vi.fn(),
  addTemplateCollaboratorAction: vi.fn(),
}));

const searchMock = vi.mocked(searchTemplateCandidatesAction);
const addMock = vi.mocked(addTemplateCollaboratorAction);

describe('TemplateCollaboratorSearch', () => {
  it('renders the search input', () => {
    renderWithProviders(<TemplateCollaboratorSearch templateId="template-1" />);

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
    renderWithProviders(<TemplateCollaboratorSearch templateId="template-1" />);

    await user.type(
      screen.getByPlaceholderText('Search by name or email'),
      'fri',
    );

    await waitFor(() => {
      expect(searchMock).toHaveBeenCalledWith('template-1', 'fri');
    });
    expect(await screen.findByText('Friend')).toBeInTheDocument();
  });

  it('shows a no-results message when the search comes back empty', async () => {
    searchMock.mockResolvedValue([]);
    const user = userEvent.setup();
    renderWithProviders(<TemplateCollaboratorSearch templateId="template-1" />);

    await user.type(
      screen.getByPlaceholderText('Search by name or email'),
      'nobody',
    );

    expect(
      await screen.findByText('No matches for “nobody”'),
    ).toBeInTheDocument();
  });

  it('adds the selected candidate as a default collaborator', async () => {
    searchMock.mockResolvedValue([
      {
        hubUserId: 'user-2',
        email: 'friend@example.com',
        name: 'Friend',
        image: null,
      },
    ]);
    addMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderWithProviders(<TemplateCollaboratorSearch templateId="template-1" />);

    await user.type(
      screen.getByPlaceholderText('Search by name or email'),
      'fri',
    );
    const result = await screen.findByText('Friend');
    await user.click(result);

    await waitFor(() => {
      expect(addMock).toHaveBeenCalledWith('template-1', {
        hubUserId: 'user-2',
        email: 'friend@example.com',
        name: 'Friend',
        image: null,
      });
    });
  });
});
