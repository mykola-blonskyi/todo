import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from './setup/render';
import { ModeToggle } from '@/features/preferences/ModeToggle';
import { updateThemeAction } from '@/features/preferences/actions';

const setTheme = vi.fn();
// What next-themes reports for this device; undefined until hydration, and
// on a device that has never stored a choice.
let storedTheme: string | undefined = 'light';
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: storedTheme, setTheme }),
}));

vi.mock('@/features/preferences/actions', () => ({
  updateThemeAction: vi.fn(),
}));

describe('ModeToggle', () => {
  it('renders light / dark / system', () => {
    renderWithIntl(<ModeToggle mode="light" />);

    expect(screen.getByRole('combobox', { name: 'Mode' })).toHaveValue('light');
    expect(screen.getByRole('option', { name: 'Light' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Dark' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'System' })).toBeInTheDocument();
  });

  it('switches immediately client-side and persists in the background', async () => {
    const user = userEvent.setup();
    renderWithIntl(<ModeToggle mode="light" />);

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Mode' }),
      'dark',
    );

    expect(setTheme).toHaveBeenCalledWith('dark');
    expect(updateThemeAction).toHaveBeenCalledWith('dark');
  });

  it('shows the mode the server resolved when this device has stored none', async () => {
    storedTheme = undefined;

    renderWithIntl(<ModeToggle mode="dark" />);

    expect(screen.getByRole('combobox', { name: 'Mode' })).toHaveValue('dark');
    storedTheme = 'light';
  });

  it('writes the mode cookie so the server renders it on the next request', async () => {
    const user = userEvent.setup();
    renderWithIntl(<ModeToggle mode="light" />);

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Mode' }),
      'dark',
    );

    expect(document.cookie).toContain('todolist-mode=dark');
  });
});
