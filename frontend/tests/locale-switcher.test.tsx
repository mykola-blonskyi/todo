import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from './setup/render';
import { LocaleSwitcher } from '@/features/preferences/LocaleSwitcher';
import { updateLocaleAction } from '@/features/preferences/actions';

const replace = vi.fn();
vi.mock('@shared/lib/i18n/navigation', () => ({
  usePathname: () => '/lists/abc-123',
  useRouter: () => ({ replace }),
}));

vi.mock('@/features/preferences/actions', () => ({
  updateLocaleAction: vi.fn(),
}));

describe('LocaleSwitcher', () => {
  it('renders a select with the current locale and every supported locale as an option', () => {
    renderWithIntl(<LocaleSwitcher />);

    const select = screen.getByRole('combobox', { name: 'Switch language' });
    expect(select).toHaveValue('en');
    expect(screen.getByRole('option', { name: 'English' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Русский' })).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Українська' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Español' })).toBeInTheDocument();
  });

  it('persists the new locale and navigates to the same path under the new locale prefix', async () => {
    const user = userEvent.setup();
    renderWithIntl(<LocaleSwitcher />);

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Switch language' }),
      'uk',
    );

    expect(updateLocaleAction).toHaveBeenCalledWith('uk');
    expect(replace).toHaveBeenCalledWith('/lists/abc-123', { locale: 'uk' });
  });
});
