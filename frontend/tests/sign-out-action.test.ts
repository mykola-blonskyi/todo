import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signOutAction } from '@/features/auth/actions';

const deleted: { name: string; path?: string }[] = [];

vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({
      delete: (arg: { name: string; path?: string }) => {
        deleted.push(arg);
      },
    }),
}));

// Referenced lazily: vi.mock hoists above this declaration, so a factory that
// captured `signOut` directly would hit the TDZ.
const signOut = vi.fn<(...args: unknown[]) => never>(() => {
  // signOut redirects by throwing, so the deletes must already have happened.
  expect(deleted).toHaveLength(5);
  throw new Error('NEXT_REDIRECT');
});
vi.mock('@features/auth/lib/auth', () => ({
  signOut: (...args: unknown[]) => signOut(...args),
}));

describe('signOutAction', () => {
  beforeEach(() => {
    deleted.length = 0;
    signOut.mockClear();
  });

  it('clears every preference cookie and the locale cookie, with a matching path, before signing out', async () => {
    await expect(signOutAction('en')).rejects.toThrow('NEXT_REDIRECT');

    expect(deleted.map((cookie) => cookie.name)).toEqual([
      'todolist-mode',
      'todolist-palette',
      'todolist-layout',
      'todolist-owner',
      'NEXT_LOCALE',
    ]);
    for (const cookie of deleted) {
      expect(cookie.path).toBe('/');
    }
    expect(signOut).toHaveBeenCalledTimes(1);
  });
});
