import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeleteListButton } from '@/features/todo-list/DeleteListButton';

describe('DeleteListButton', () => {
  it('renders the given label', () => {
    const action = vi.fn().mockResolvedValue(undefined);
    render(
      <DeleteListButton
        action={action}
        label="Delete"
        confirmMessage="Delete this list?"
      />,
    );

    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('does not call action when the confirm dialog is dismissed', async () => {
    const user = userEvent.setup();
    const action = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false);

    render(
      <DeleteListButton
        action={action}
        label="Delete"
        confirmMessage="Delete this list?"
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(action).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('calls action when the confirm dialog is accepted', async () => {
    const user = userEvent.setup();
    const action = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);

    render(
      <DeleteListButton
        action={action}
        label="Delete"
        confirmMessage="Delete this list?"
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(action).toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
