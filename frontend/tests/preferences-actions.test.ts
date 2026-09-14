import { beforeEach, describe, expect, it, vi } from 'vitest';

const setCookie = vi.fn();
vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve({ set: setCookie }),
}));

const graphqlFetch = vi.fn();
vi.mock('@shared/lib/graphql-client', () => ({
  graphqlFetch: (...args: unknown[]) => graphqlFetch(...args) as unknown,
}));

vi.mock('@/features/preferences/server', () => ({
  currentPreferenceOwner: () => Promise.resolve('owner-1'),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('preference actions when the backend is down', () => {
  it.each([
    ['updatePaletteAction', 'ocean'],
    ['updateLayoutAction', 'board'],
    ['updateThemeAction', 'dark'],
    ['updateLocaleAction', 'uk'],
  ])('%s does not reject', async (name, value) => {
    graphqlFetch.mockRejectedValue(new Error('backend down'));
    const actions = await import('@/features/preferences/actions');
    const action = actions[name as keyof typeof actions] as (
      v: string,
    ) => Promise<void>;

    await expect(action(value)).resolves.toBeUndefined();
    expect(graphqlFetch).toHaveBeenCalledOnce();
  });

  it('still writes the palette cookie the server renders from', async () => {
    graphqlFetch.mockRejectedValue(new Error('backend down'));
    const { updatePaletteAction } =
      await import('@/features/preferences/actions');

    await updatePaletteAction('ocean');

    expect(setCookie).toHaveBeenCalledWith(
      'todolist-palette',
      'ocean',
      expect.anything(),
    );
  });
});
