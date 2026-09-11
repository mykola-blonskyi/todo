import { beforeEach, describe, expect, it, vi } from 'vitest';

const cookieValues = new Map<string, string>();
const headerValues = new Map<string, string>();

vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({
      get: (name: string) => {
        const value = cookieValues.get(name);
        return value === undefined ? undefined : { name, value };
      },
    }),
  headers: () =>
    Promise.resolve({ get: (name: string) => headerValues.get(name) ?? null }),
}));

const graphqlFetch = vi.fn();
vi.mock('@shared/lib/graphql-client', () => ({
  graphqlFetch: (...args: unknown[]) => graphqlFetch(...args) as unknown,
}));

// react's cache() memoizes per request; in tests every call is its own
// "request", so import the module fresh for each case.
async function getAppearance() {
  vi.resetModules();
  const { getAppearance: fn } = await import('@/features/preferences/server');
  return fn();
}

describe('getAppearance', () => {
  beforeEach(() => {
    cookieValues.clear();
    headerValues.clear();
    graphqlFetch.mockReset();
    headerValues.set('x-user-id', 'user-1');
  });

  it('never asks the backend when all three cookies are present', async () => {
    cookieValues.set('todolist-mode', 'dark');
    cookieValues.set('todolist-palette', 'ocean');
    cookieValues.set('todolist-layout', 'terminal');

    const appearance = await getAppearance();

    expect(graphqlFetch).not.toHaveBeenCalled();
    expect(appearance).toEqual({
      mode: 'dark',
      palette: 'ocean',
      layout: 'terminal',
      fromBackend: false,
    });
  });

  it('reads the persisted mode from the User row on a fresh device', async () => {
    graphqlFetch.mockResolvedValue({
      me: { theme: 'dark', palette: 'ocean', layout: 'terminal' },
    });

    const appearance = await getAppearance();

    expect(graphqlFetch).toHaveBeenCalledTimes(1);
    expect(appearance).toEqual({
      mode: 'dark',
      palette: 'ocean',
      layout: 'terminal',
      // Drives PreferenceCookieSync, which back-fills all three cookies so
      // the next request is cookie-only again.
      fromBackend: true,
    });
  });

  it('asks for the mode when only that cookie is missing', async () => {
    // The state every existing browser is in right after this ships.
    cookieValues.set('todolist-palette', 'ocean');
    cookieValues.set('todolist-layout', 'terminal');
    graphqlFetch.mockResolvedValue({
      me: { theme: 'system', palette: 'classic', layout: 'workspace' },
    });

    const appearance = await getAppearance();

    expect(appearance.mode).toBe('system');
    // Cookies still win for the values this device has already chosen.
    expect(appearance.palette).toBe('ocean');
    expect(appearance.layout).toBe('terminal');
  });

  it('prefers the cookie over the row for mode too', async () => {
    cookieValues.set('todolist-mode', 'light');
    graphqlFetch.mockResolvedValue({
      me: { theme: 'dark', palette: 'classic', layout: 'workspace' },
    });

    const appearance = await getAppearance();

    expect(appearance.mode).toBe('light');
  });

  it('falls back to defaults without asking when unauthenticated', async () => {
    headerValues.delete('x-user-id');

    const appearance = await getAppearance();

    expect(graphqlFetch).not.toHaveBeenCalled();
    expect(appearance.mode).toBe('light');
  });

  it('falls back to defaults when the lookup fails, rather than throwing', async () => {
    graphqlFetch.mockRejectedValue(new Error('backend down'));

    const appearance = await getAppearance();

    expect(appearance).toEqual({
      mode: 'light',
      palette: 'classic',
      layout: 'workspace',
      fromBackend: false,
    });
  });

  it('falls back to the default for an unknown stored mode', async () => {
    cookieValues.set('todolist-mode', 'sepia');
    cookieValues.set('todolist-palette', 'classic');
    cookieValues.set('todolist-layout', 'workspace');

    const appearance = await getAppearance();

    expect(appearance.mode).toBe('light');
  });
});
