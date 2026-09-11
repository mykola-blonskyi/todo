import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { PreferenceCookieSync } from '@/features/preferences/PreferenceCookieSync';

// What next-themes resolved for this device: localStorage if it has a value,
// else the provider's defaultTheme (which is the server-resolved mode).
let storedTheme: string | undefined = 'dark';
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: storedTheme }),
}));

function clearCookies() {
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0]?.trim();
    if (name) document.cookie = `${name}=; path=/; max-age=0`;
  }
}

describe('PreferenceCookieSync', () => {
  beforeEach(clearCookies);
  afterEach(() => {
    storedTheme = 'dark';
  });

  it('back-fills the palette and layout cookies from the server value', () => {
    render(<PreferenceCookieSync palette="ocean" layout="terminal" />);

    expect(document.cookie).toContain('todolist-palette=ocean');
    expect(document.cookie).toContain('todolist-layout=terminal');
  });

  it('writes the mode this device actually applies, not the one from the row', () => {
    // The server resolved `light` from the User row and handed it to
    // next-themes as defaultTheme, but this device's localStorage says
    // `dark`, so that is what got painted. Pinning the row's value into the
    // cookie would leave every later request rendering a mode the page
    // contradicts (TODO-61).
    storedTheme = 'dark';

    render(<PreferenceCookieSync palette="classic" layout="workspace" />);

    expect(document.cookie).toContain('todolist-mode=dark');
    expect(document.cookie).not.toContain('todolist-mode=light');
  });

  it('keeps `system` as a preference rather than resolving it away', () => {
    storedTheme = 'system';

    render(<PreferenceCookieSync palette="classic" layout="workspace" />);

    expect(document.cookie).toContain('todolist-mode=system');
  });

  it('writes no mode cookie until next-themes has read storage', () => {
    // Leaving it unwritten costs one more lookup on the next request; a
    // wrong value would persist until the User toggles mode by hand.
    storedTheme = undefined;

    render(<PreferenceCookieSync palette="classic" layout="workspace" />);

    expect(document.cookie).not.toContain('todolist-mode=');
    expect(document.cookie).toContain('todolist-palette=classic');
  });
});
