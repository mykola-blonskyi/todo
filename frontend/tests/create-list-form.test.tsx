import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from './setup/render';
import { CreateListForm } from '@/features/todos-list/CreateListForm';
import { createListAction } from '@/features/todos-list/actions';

vi.mock('@/features/todos-list/actions', () => ({
  createListAction: vi.fn(),
}));

describe('CreateListForm', () => {
  it('renders the input and submit button with the right labels', () => {
    renderWithIntl(<CreateListForm />);

    expect(
      screen.getByRole('textbox', { name: 'New list title' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
  });

  it('submits the form action when the button is clicked', async () => {
    const user = userEvent.setup();
    renderWithIntl(<CreateListForm />);

    await user.type(screen.getByPlaceholderText('New list title'), 'Groceries');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(createListAction).toHaveBeenCalled();
  });
});
