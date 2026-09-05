import { describe, expect, it } from 'vitest';
import { jwtCallback } from '@features/auth/lib/jwt-callback';

// Regression test for a real, live-reproduced bug (see docs/decisions.md
// ADR-016): without a database adapter, Auth.js does not treat a bare
// inline provider's profile()-returned `id` as canonical - it assigns
// `user.id` a fresh random id on every sign-in instead. `profile.sub` (the
// verified ID token's own claim) is the only value actually stable across
// sign-ins. This test deliberately doesn't pass a `user` at all, so it
// fails loudly if this callback is ever "simplified" back to reading
// `user.id` instead of `profile.sub`.
describe('jwtCallback', () => {
  it('reads the stable id from profile.sub, not from user.id', () => {
    const token = { name: 'Mykola', email: 'a@example.com' };

    const result = jwtCallback({
      token,
      profile: { sub: 'stable-login-sub', email: 'a@example.com' },
    });

    expect(result.userId).toBe('stable-login-sub');
  });

  it('leaves token.userId untouched when profile is absent (token refresh, not initial sign-in)', () => {
    const token = { userId: 'already-set', name: 'Mykola' };

    const result = jwtCallback({ token, profile: undefined });

    expect(result.userId).toBe('already-set');
  });

  it('does nothing when profile has no sub claim', () => {
    const token = { name: 'Mykola' };

    const result = jwtCallback({ token, profile: { email: 'a@example.com' } });

    expect(result.userId).toBeUndefined();
  });
});
