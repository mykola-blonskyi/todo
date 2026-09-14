import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from './setup/render';
import { Drawer } from '@/layouts/board/Drawer';

const push = vi.fn();
vi.mock('@shared/lib/i18n/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
  redirect: vi.fn(),
  getPathname: () => '/',
  Link: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function renderDrawer() {
  return renderWithIntl(
    <Drawer
      backHref="/"
      closeLabel="Close"
      title="Launch todo v2"
      crumb={<span>Board / Launch todo v2</span>}
    >
      <input aria-label="Task title" defaultValue="Write release notes" />
    </Drawer>,
  );
}

describe('Drawer', () => {
  it('is a labelled dialog', () => {
    renderDrawer();

    expect(
      screen.getByRole('dialog', { name: 'Launch todo v2' }),
    ).toBeInTheDocument();
  });

  it('moves focus into the panel on open', () => {
    renderDrawer();

    const dialog = screen.getByRole('dialog');
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it('navigates back on Escape', async () => {
    const user = userEvent.setup();
    push.mockClear();
    renderDrawer();

    await user.keyboard('{Escape}');

    expect(push).toHaveBeenCalledWith('/');
  });

  it('navigates back via the close button', async () => {
    const user = userEvent.setup();
    push.mockClear();
    renderDrawer();

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(push).toHaveBeenCalledWith('/');
  });
});
