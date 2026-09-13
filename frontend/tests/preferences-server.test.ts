import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ANON_OWNER, preferenceOwner } from '@/features/preferences/owner';

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

const OWNER_1 = preferenceOwner('user-1');

describe('getAppearance', () => {
  beforeEach(() => {
    cookieValues.clear();
    headerValues.clear();
    graphqlFetch.mockReset();
    headerValues.set('x-user-id', 'user-1');
  });

  it('returns cookie values without asking the backend when the stamp matches the owner', async () => {
    cookieValues.set('todolist-mode', 'dark');
    cookieValues.set('todolist-palette', 'ocean');
    cookieValues.set('todolist-layout', 'terminal');
    cookieValues.set('todolist-owner', OWNER_1);

    const appearance = await getAppearance();

    expect(graphqlFetch).not.toHaveBeenCalled();
    expect(appearance).toEqual({
      mode: 'dark',
      palette: 'ocean',
      layout: 'terminal',
      owner: OWNER_1,
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
      owner: OWNER_1,
      // Drives PreferenceCookieSync, which back-fills all three cookies so
      // the next request is cookie-only again.
      fromBackend: true,
    });
  });

  it('queries and returns the row when the stamp belongs to a different owner', async () => {
    cookieValues.set('todolist-mode', 'dark');
    cookieValues.set('todolist-palette', 'ocean');
    cookieValues.set('todolist-layout', 'terminal');
    cookieValues.set('todolist-owner', preferenceOwner('user-2'));
    graphqlFetch.mockResolvedValue({
      me: { theme: 'light', palette: 'classic', layout: 'workspace' },
    });

    const appearance = await getAppearance();

    expect(graphqlFetch).toHaveBeenCalledTimes(1);
    expect(appearance.mode).toBe('light');
    expect(appearance.palette).toBe('classic');
    expect(appearance.layout).toBe('workspace');
  });

  it('queries and returns the row when all three cookies are present but carry no stamp', async () => {
    cookieValues.set('todolist-mode', 'dark');
    cookieValues.set('todolist-palette', 'ocean');
    cookieValues.set('todolist-layout', 'terminal');
    graphqlFetch.mockResolvedValue({
      me: { theme: 'light', palette: 'classic', layout: 'workspace' },
    });

    const appearance = await getAppearance();

    expect(graphqlFetch).toHaveBeenCalledTimes(1);
    expect(appearance.mode).toBe('light');
    expect(appearance.palette).toBe('classic');
    expect(appearance.layout).toBe('workspace');
  });

  it('queries the row when the mode cookie is missing, and the row wins even for axes with a cookie', async () => {
    // Every existing browser right after this ships: no stamp at all.
    cookieValues.set('todolist-palette', 'ocean');
    cookieValues.set('todolist-layout', 'terminal');
    graphqlFetch.mockResolvedValue({
      me: { theme: 'system', palette: 'classic', layout: 'workspace' },
    });

    const appearance = await getAppearance();

    expect(appearance.mode).toBe('system');
    expect(appearance.palette).toBe('classic');
    expect(appearance.layout).toBe('workspace');
  });

  it('the row wins over an untrusted mode cookie', async () => {
    cookieValues.set('todolist-mode', 'light');
    graphqlFetch.mockResolvedValue({
      me: { theme: 'dark', palette: 'classic', layout: 'workspace' },
    });

    const appearance = await getAppearance();

    expect(appearance.mode).toBe('dark');
  });

  it('falls back to defaults with the unknown mode when unauthenticated, without asking', async () => {
    headerValues.delete('x-user-id');

    const appearance = await getAppearance();

    expect(graphqlFetch).not.toHaveBeenCalled();
    expect(appearance).toEqual({
      mode: 'system', // UNKNOWN_MODE - follows the OS rather than flashing light
      palette: 'classic',
      layout: 'workspace',
      owner: ANON_OWNER,
      fromBackend: false,
    });
  });

  it('falls back to defaults when the lookup fails, rather than throwing', async () => {
    graphqlFetch.mockRejectedValue(new Error('backend down'));

    const appearance = await getAppearance();

    expect(appearance).toEqual({
      mode: 'light',
      palette: 'classic',
      layout: 'workspace',
      owner: OWNER_1,
      fromBackend: false,
    });
  });

  it('keeps a trusted cookie for the axes that have one when another forced the query', async () => {
    cookieValues.set('todolist-palette', 'ocean');
    cookieValues.set('todolist-layout', 'terminal');
    cookieValues.set('todolist-owner', OWNER_1);
    graphqlFetch.mockResolvedValue({
      me: { theme: 'dark', palette: 'classic', layout: 'workspace' },
    });

    const appearance = await getAppearance();

    expect(appearance.mode).toBe('dark');
    expect(appearance.palette).toBe('ocean');
    expect(appearance.layout).toBe('terminal');
  });

  it('keeps trusted cookies rather than resetting to defaults when the lookup fails', async () => {
    cookieValues.set('todolist-palette', 'ocean');
    cookieValues.set('todolist-layout', 'terminal');
    cookieValues.set('todolist-owner', OWNER_1);
    graphqlFetch.mockRejectedValue(new Error('backend down'));

    const appearance = await getAppearance();

    expect(appearance.palette).toBe('ocean');
    expect(appearance.layout).toBe('terminal');
  });

  it('falls back to the default for an unknown stored mode', async () => {
    cookieValues.set('todolist-mode', 'sepia');
    cookieValues.set('todolist-palette', 'classic');
    cookieValues.set('todolist-layout', 'workspace');
    cookieValues.set('todolist-owner', OWNER_1);

    const appearance = await getAppearance();

    expect(appearance.mode).toBe('light');
  });
});
