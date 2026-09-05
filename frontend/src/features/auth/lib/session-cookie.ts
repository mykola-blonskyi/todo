// One definition of todolist's own session cookie, shared by the write side
// (auth.ts's cookies.sessionToken), the read side (identity.ts's getToken) and
// graphql-client.ts's outbound filter - all three must agree exactly.
export const SESSION_COOKIE_NAME = 'authjs.session-token';
export const SESSION_COOKIE_SECURE = process.env.NODE_ENV === 'production';

// Auth.js's own cookie namespace on this app - session token (chunked into
// .0/.1/... past ~4096 bytes), callback-url, csrf-token, pkce/state. None of
// these are the hub's to receive; a prefix match is what actually catches
// the chunked session-token variants too, not just the unchunked name.
export const AUTHJS_COOKIE_PREFIX = 'authjs.';

// Drops every pair whose name starts with prefix from a raw `cookie`
// header, returning null when nothing is left worth forwarding.
export function stripCookiesWithPrefix(
  cookieHeader: string,
  prefix: string,
): string | null {
  const kept = cookieHeader
    .split(';')
    .map((pair) => pair.trim())
    .filter((pair) => {
      if (pair === '') return false;
      const separator = pair.indexOf('=');
      const name = separator === -1 ? pair : pair.slice(0, separator);
      return !name.startsWith(prefix);
    });

  return kept.length > 0 ? kept.join('; ') : null;
}
