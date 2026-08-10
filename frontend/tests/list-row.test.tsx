import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithIntl } from './setup/render';
import { ListRow } from '@/features/todos-list/ListRow';

describe('ListRow', () => {
  it('renders the list title as a link to the list detail page', () => {
    renderWithIntl(<ListRow list={{ id: 'list-1', title: 'Groceries' }} />);

    const link = screen.getByRole('link', { name: 'Groceries' });
    expect(link).toHaveAttribute('href', '/lists/list-1');
  });
});
