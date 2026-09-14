import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from './setup/render';
import { Sheet } from '@/layouts/pocket/Sheet';

function renderSheet() {
  return renderWithIntl(
    <Sheet label="New list" closeLabel="Close">
      <input aria-label="Title" />
    </Sheet>,
  );
}

describe('Sheet', () => {
  it('is closed until the trigger is activated', () => {
    renderSheet();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens as a labelled dialog and moves focus into it', async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.click(screen.getByRole('button', { name: 'New list' }));

    const dialog = screen.getByRole('dialog', { name: 'New list' });
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    renderSheet();
    const trigger = screen.getByRole('button', { name: 'New list' });

    await user.click(trigger);
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('closes via the close button and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    renderSheet();
    const trigger = screen.getByRole('button', { name: 'New list' });

    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
