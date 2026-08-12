import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from './setup/render';
import { TemplateCollaboratorRow } from '@/features/list-templates/TemplateCollaboratorRow';
import { removeTemplateCollaboratorAction } from '@/features/list-templates/actions';

vi.mock('@/features/list-templates/actions', () => ({
  removeTemplateCollaboratorAction: vi.fn(),
}));

const collaborator = {
  id: 'user-2',
  email: 'friend@example.com',
  name: 'Friend',
  image: null,
};

describe('TemplateCollaboratorRow', () => {
  it('renders the collaborator name and email', () => {
    renderWithIntl(
      <TemplateCollaboratorRow
        templateId="template-1"
        collaborator={collaborator}
      />,
    );

    expect(screen.getByText('Friend')).toBeInTheDocument();
    expect(screen.getByText('friend@example.com')).toBeInTheDocument();
  });

  it('calls removeTemplateCollaboratorAction when Remove is clicked', async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <TemplateCollaboratorRow
        templateId="template-1"
        collaborator={collaborator}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Remove' }));

    expect(removeTemplateCollaboratorAction).toHaveBeenCalledWith(
      'template-1',
      'user-2',
    );
  });
});
