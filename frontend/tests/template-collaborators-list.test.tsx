import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithIntl } from './setup/render';
import { TemplateCollaboratorsList } from '@/features/list-templates/TemplateCollaboratorsList';

vi.mock('@/features/list-templates/actions', () => ({
  removeTemplateCollaboratorAction: vi.fn(),
}));

describe('TemplateCollaboratorsList', () => {
  it('renders nothing when there are no collaborators', () => {
    const { container } = renderWithIntl(
      <TemplateCollaboratorsList templateId="template-1" collaborators={[]} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders a heading and a row per collaborator', () => {
    renderWithIntl(
      <TemplateCollaboratorsList
        templateId="template-1"
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
      />,
    );

    expect(screen.getByText('Default collaborators')).toBeInTheDocument();
    expect(screen.getByText('Friend')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Remove' })).toHaveLength(2);
  });
});
