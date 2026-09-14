import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from './setup/render';
import { nav } from './setup/fixtures';
import { LedgerTable } from '@/layouts/ledger/LedgerTable';

vi.mock('@/features/todo-list/actions', () => ({
  toggleTaskDoneAction: vi.fn(),
  createTaskAction: vi.fn(),
}));

describe('LedgerTable', () => {
  it('names the quick-add task input after the list it adds to', async () => {
    const user = userEvent.setup();
    renderWithIntl(<LedgerTable lists={nav.lists} />);

    const list = nav.lists[0];
    const row = screen.getByText(list.title).closest('tr')!;
    await user.click(within(row).getByRole('button', { name: 'Expand row' }));

    expect(
      screen.getByRole('textbox', { name: `Add a task to ${list.title}` }),
    ).toBeInTheDocument();
  });
});
