import { describe, expect, it } from 'vitest';
import {
  SESSION_COOKIE_NAME,
  stripCookie,
} from '@features/auth/lib/session-cookie';

// graphqlFetch forwards the incoming cookie header to the backend, which
// passes it to the hub's project-members search (TODO-54). Todolist's own
// session cookie must not ride along: the hub can't validate it and has no
// business holding this app's live credential.
describe('stripCookie', () => {
  it('forwards nothing when todolist’s cookie is the only one present', () => {
    expect(
      stripCookie(`${SESSION_COOKIE_NAME}=abc123`, SESSION_COOKIE_NAME),
    ).toBeNull();
  });

  it('forwards only the other cookie when both are present', () => {
    expect(
      stripCookie(
        `${SESSION_COOKIE_NAME}=abc123; hub-session=xyz789`,
        SESSION_COOKIE_NAME,
      ),
    ).toBe('hub-session=xyz789');

    expect(
      stripCookie(
        `hub-session=xyz789; ${SESSION_COOKIE_NAME}=abc123; NEXT_LOCALE=uk`,
        SESSION_COOKIE_NAME,
      ),
    ).toBe('hub-session=xyz789; NEXT_LOCALE=uk');
  });

  it('leaves an unrelated cookie header unchanged', () => {
    expect(stripCookie('hub-session=xyz789', SESSION_COOKIE_NAME)).toBe(
      'hub-session=xyz789',
    );
  });

  it('returns null for an empty header', () => {
    expect(stripCookie('', SESSION_COOKIE_NAME)).toBeNull();
  });

  it('does not strip a cookie whose name merely shares a prefix', () => {
    expect(
      stripCookie(`${SESSION_COOKIE_NAME}.sig=abc123`, SESSION_COOKIE_NAME),
    ).toBe(`${SESSION_COOKIE_NAME}.sig=abc123`);
  });
});
