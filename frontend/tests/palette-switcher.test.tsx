import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from './setup/render';
import { PaletteSwitcher } from '@/features/preferences/PaletteSwitcher';
import { updatePaletteAction } from '@/features/preferences/actions';

vi.mock('@/features/preferences/actions', () => ({
  updatePaletteAction: vi.fn(() => Promise.resolve()),
}));

describe('PaletteSwitcher', () => {
  it('lists every palette with the current one selected', () => {
    renderWithIntl(<PaletteSwitcher palette="ocean" />);

    expect(screen.getByRole('combobox', { name: 'Palette' })).toHaveValue(
      'ocean',
    );
    expect(screen.getAllByRole('option')).toHaveLength(12);
    expect(screen.getByRole('option', { name: 'Classic' })).toBeInTheDocument();
  });

  it('swaps the theme-* class on <html> synchronously, then persists', async () => {
    const user = userEvent.setup();
    document.documentElement.className = 'theme-ocean h-full';
    renderWithIntl(<PaletteSwitcher palette="ocean" />);

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Palette' }),
      'honey',
    );

    expect(document.documentElement.classList.contains('theme-honey')).toBe(
      true,
    );
    expect(document.documentElement.classList.contains('theme-ocean')).toBe(
      false,
    );
    expect(document.documentElement.classList.contains('h-full')).toBe(true);
    await waitFor(() =>
      expect(updatePaletteAction).toHaveBeenCalledWith('honey'),
    );
  });

  it('removes the class entirely for classic', async () => {
    const user = userEvent.setup();
    document.documentElement.className = 'theme-honey';
    renderWithIntl(<PaletteSwitcher palette="honey" />);

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Palette' }),
      'classic',
    );

    expect(document.documentElement.className).toBe('');
  });
});
