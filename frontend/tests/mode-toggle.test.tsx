import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../messages/en.json';
import { renderWithIntl } from './setup/render';
import { ModeToggle } from '@/features/preferences/ModeToggle';
import { updateThemeAction } from '@/features/preferences/actions';

const setTheme = vi.fn();
// What next-themes reports for this device. It seeds from localStorage and
// falls back to the provider's defaultTheme, so after hydration it is always
// a real mode - the `mode` prop only stands in before that.
let storedTheme = 'light';
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: storedTheme, setTheme }),
}));

vi.mock('@/features/preferences/actions', () => ({
  updateThemeAction: vi.fn(),
}));

afterEach(() => {
  storedTheme = 'light';
});

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

  it('renders the server-resolved mode before hydration', () => {
    // The pre-hydration path, which a client render can't show: server-side
    // there is no next-themes state, so the markup must carry the mode the
    // server resolved from the User row (TODO-61). next-themes is mocked as
    // reporting something else, so only the `mode` prop can produce `dark`.
    storedTheme = 'light';

    const html = renderToStaticMarkup(
      <NextIntlClientProvider locale="en" messages={messages}>
        <ModeToggle mode="dark" />
      </NextIntlClientProvider>,
    );

    expect(html).toContain('<option value="dark" selected="">Dark</option>');
    expect(html).not.toContain('<option value="light" selected="">');
  });

  it('shows what this device stored, not the server value, once hydrated', () => {
    // localStorage beats the User row: next-themes already applied `dark`,
    // so the select must agree with the page rather than with the server.
    storedTheme = 'dark';

    renderWithIntl(<ModeToggle mode="light" />);

    expect(screen.getByRole('combobox', { name: 'Mode' })).toHaveValue('dark');
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
