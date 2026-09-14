import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderWithIntl } from './setup/render';
import ErrorPage from '@/app/[locale]/error';
import GlobalError from '@/app/global-error';

describe('ErrorPage', () => {
  it('re-fetches the failed render rather than only clearing the boundary', async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    renderWithIntl(
      <ErrorPage error={new Error('boom')} unstable_retry={retry} />,
    );

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(retry).toHaveBeenCalledOnce();
  });

  it('shows the digest, which is all that ties this page to a server log', () => {
    const error = Object.assign(new Error('boom'), { digest: 'abc123' });
    renderWithIntl(<ErrorPage error={error} unstable_retry={vi.fn()} />);

    expect(screen.getByText('Reference: abc123')).toBeInTheDocument();
  });

  it('omits the reference when there is no digest to quote', () => {
    renderWithIntl(
      <ErrorPage error={new Error('boom')} unstable_retry={vi.fn()} />,
    );

    expect(screen.queryByText(/Reference:/)).not.toBeInTheDocument();
  });
});

describe('GlobalError', () => {
  it('renders standalone, with nothing wrapping it', () => {
    const html = renderToStaticMarkup(
      <GlobalError error={new Error('boom')} unstable_retry={vi.fn()} />,
    );

    expect(html).toContain('<html lang="en">');
    expect(html).toContain('prefers-color-scheme: dark');
    expect(html).toContain('Something went wrong');
    expect(html).toContain('Try again');
  });
});
