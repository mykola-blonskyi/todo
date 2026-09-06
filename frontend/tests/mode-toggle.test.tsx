import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from './setup/render';
import { ModeToggle } from '@/features/preferences/ModeToggle';
import { updateThemeAction } from '@/features/preferences/actions';

const setTheme = vi.fn();
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme }),
}));

vi.mock('@/features/preferences/actions', () => ({
  updateThemeAction: vi.fn(),
}));

describe('ModeToggle', () => {
  it('renders light / dark / system', () => {
    renderWithIntl(<ModeToggle />);

    expect(screen.getByRole('combobox', { name: 'Mode' })).toHaveValue('light');
    expect(screen.getByRole('option', { name: 'Light' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Dark' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'System' })).toBeInTheDocument();
  });

  it('switches immediately client-side and persists in the background', async () => {
    const user = userEvent.setup();
    renderWithIntl(<ModeToggle />);

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Mode' }),
      'dark',
    );

    expect(setTheme).toHaveBeenCalledWith('dark');
    expect(updateThemeAction).toHaveBeenCalledWith('dark');
  });
});
