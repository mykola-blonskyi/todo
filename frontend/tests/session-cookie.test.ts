import { describe, expect, it } from 'vitest';
import { hubSessionCookie } from '@features/auth/lib/session-cookie';

// graphqlFetch forwards the incoming cookie header to the backend, which
// passes it to the hub's project-members search (TODO-54). Only the hub's own
// session cookie may ride along: it is the one thing the hub can validate, and
// this app's cookies are none of its business.
describe('hubSessionCookie', () => {
  it("forwards the hub's session cookie", () => {
    expect(hubSessionCookie('authjs.session-token=abc123')).toBe(
      'authjs.session-token=abc123',
    );
  });

  it("drops todolist's own session cookie, which the hub can't validate", () => {
    expect(
      hubSessionCookie(
        'todolist.session-token=xyz789; authjs.session-token=abc123',
      ),
    ).toBe('authjs.session-token=abc123');
  });

  it("drops todolist's other Auth.js cookies and unrelated ones", () => {
    expect(
      hubSessionCookie(
        'authjs.callback-url=%2Flists; authjs.csrf-token=deadbeef%7Chash; authjs.session-token=abc123; NEXT_LOCALE=uk',
      ),
    ).toBe('authjs.session-token=abc123');
  });

  it('keeps chunked session-token cookies (large JWTs split past ~4096 bytes)', () => {
    expect(
      hubSessionCookie(
        'authjs.session-token.0=chunk1; NEXT_LOCALE=uk; authjs.session-token.1=chunk2',
      ),
    ).toBe('authjs.session-token.0=chunk1; authjs.session-token.1=chunk2');
  });

  it('returns null when the hub cookie is absent', () => {
    expect(hubSessionCookie('todolist.session-token=xyz789')).toBeNull();
    expect(hubSessionCookie('')).toBeNull();
  });
});
