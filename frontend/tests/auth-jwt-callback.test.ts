import { describe, expect, it } from 'vitest';
import { jwtCallback } from '@features/auth/lib/jwt-callback';

// Regression test for a live-reproduced bug (ADR-016): without an adapter,
// Auth.js assigns `user.id` a fresh random value on every sign-in, so only
// `profile.sub` is stable. These deliberately pass no `user` at all, so they
// fail loudly if this is ever "simplified" back to reading `user.id`.
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
