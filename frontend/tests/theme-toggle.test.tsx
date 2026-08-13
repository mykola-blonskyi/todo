import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from './setup/render';
import { ThemeToggle } from '@/features/preferences/ThemeToggle';
import { updateThemeAction } from '@/features/preferences/actions';

const setTheme = vi.fn();
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme }),
}));

vi.mock('@/features/preferences/actions', () => ({
  updateThemeAction: vi.fn(),
}));

describe('ThemeToggle', () => {
  it('renders a select with the current theme and all three options', () => {
    renderWithIntl(<ThemeToggle />);

    expect(screen.getByRole('combobox', { name: 'Toggle theme' })).toHaveValue(
      'light',
    );
    expect(screen.getByRole('option', { name: 'Light' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Dark' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Rose' })).toBeInTheDocument();
  });

  it('switches theme immediately client-side and persists in the background', async () => {
    const user = userEvent.setup();
    renderWithIntl(<ThemeToggle />);

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Toggle theme' }),
      'dark',
    );

    expect(setTheme).toHaveBeenCalledWith('dark');
    expect(updateThemeAction).toHaveBeenCalledWith('dark');
  });
});
