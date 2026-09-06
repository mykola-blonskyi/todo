import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from './setup/render';
import { LayoutSwitcher } from '@/features/preferences/LayoutSwitcher';
import { updateLayoutAction } from '@/features/preferences/actions';

vi.mock('@/features/preferences/actions', () => ({
  updateLayoutAction: vi.fn(() => Promise.resolve()),
}));

describe('LayoutSwitcher', () => {
  it('offers all six layouts', () => {
    renderWithIntl(<LayoutSwitcher layout="workspace" />);

    expect(screen.getByRole('combobox', { name: 'Layout' })).toHaveValue(
      'workspace',
    );
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Workspace',
      'Board',
      'Notebook',
      'Pocket',
      'Terminal',
      'Ledger',
    ]);
  });

  it('hands the choice to the server action (which sets the cookie and re-renders)', async () => {
    const user = userEvent.setup();
    renderWithIntl(<LayoutSwitcher layout="workspace" />);

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Layout' }),
      'terminal',
    );

    await waitFor(() =>
      expect(updateLayoutAction).toHaveBeenCalledWith('terminal'),
    );
  });
});
