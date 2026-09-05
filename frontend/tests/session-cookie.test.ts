import { describe, expect, it } from 'vitest';
import {
  AUTHJS_COOKIE_PREFIX,
  stripCookiesWithPrefix,
} from '@features/auth/lib/session-cookie';

// graphqlFetch forwards the incoming cookie header to the backend, which
// passes it to the hub's project-members search (TODO-54). None of
// todolist's own Auth.js-owned cookies must ride along: the hub can't
// validate them and has no business holding this app's live session state.
describe('stripCookiesWithPrefix', () => {
  it('forwards nothing when an authjs cookie is the only one present', () => {
    expect(
      stripCookiesWithPrefix(
        'authjs.session-token=abc123',
        AUTHJS_COOKIE_PREFIX,
      ),
    ).toBeNull();
  });

  it('forwards only the other cookie when both are present', () => {
    expect(
      stripCookiesWithPrefix(
        'authjs.session-token=abc123; hub-session=xyz789',
        AUTHJS_COOKIE_PREFIX,
      ),
    ).toBe('hub-session=xyz789');

    expect(
      stripCookiesWithPrefix(
        'hub-session=xyz789; authjs.session-token=abc123; NEXT_LOCALE=uk',
        AUTHJS_COOKIE_PREFIX,
      ),
    ).toBe('hub-session=xyz789; NEXT_LOCALE=uk');
  });

  it('strips every authjs-prefixed cookie, not just the session token', () => {
    expect(
      stripCookiesWithPrefix(
        'authjs.callback-url=%2Flists; authjs.csrf-token=deadbeef%7Chash; hub-session=xyz789',
        AUTHJS_COOKIE_PREFIX,
      ),
    ).toBe('hub-session=xyz789');
  });

  it('strips chunked session-token cookies (large JWTs split past ~4096 bytes)', () => {
    expect(
      stripCookiesWithPrefix(
        'authjs.session-token.0=chunk1; hub-session=xyz789; authjs.session-token.1=chunk2',
        AUTHJS_COOKIE_PREFIX,
      ),
    ).toBe('hub-session=xyz789');
  });

  it('leaves an unrelated cookie header unchanged', () => {
    expect(
      stripCookiesWithPrefix('hub-session=xyz789', AUTHJS_COOKIE_PREFIX),
    ).toBe('hub-session=xyz789');
  });

  it('returns null for an empty header', () => {
    expect(stripCookiesWithPrefix('', AUTHJS_COOKIE_PREFIX)).toBeNull();
  });
});
