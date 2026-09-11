import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@/shared/ui/theme-provider';

// next-themes' own provider, reduced to a probe of the props it is handed -
// the point of this test is the wiring, not next-themes' behaviour.
vi.mock('next-themes', () => ({
  ThemeProvider: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <div data-testid="next-themes" data-props={JSON.stringify(props)}>
      {children}
    </div>
  ),
}));

describe('ThemeProvider', () => {
  it('hands the server-resolved mode to next-themes as its defaultTheme', () => {
    // This is the whole no-flash mechanism: next-themes inlines defaultTheme
    // into its pre-paint script as the fallback for an empty localStorage,
    // so a fresh device paints the persisted mode (TODO-61).
    render(
      <ThemeProvider mode="dark">
        <span>content</span>
      </ThemeProvider>,
    );

    const props: Record<string, unknown> = JSON.parse(
      screen.getByTestId('next-themes').dataset.props ?? '{}',
    ) as Record<string, unknown>;

    expect(props.defaultTheme).toBe('dark');
    expect(props.attribute).toBe('class');
    expect(props.enableSystem).toBe(true);
    expect(screen.getByText('content')).toBeInTheDocument();
  });
});
