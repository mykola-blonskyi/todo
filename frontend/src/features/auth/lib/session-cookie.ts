// One definition of todolist's own session cookie, shared by the write side
// (auth.ts's cookies.sessionToken), the read side (identity.ts's getToken) and
// graphql-client.ts's outbound filter - all three must agree exactly.
export const SESSION_COOKIE_NAME = 'authjs.session-token';
export const SESSION_COOKIE_SECURE = process.env.NODE_ENV === 'production';

// Drops one pair from a raw `cookie` header, returning null when nothing is
// left worth forwarding.
export function stripCookie(cookieHeader: string, name: string): string | null {
  const kept = cookieHeader
    .split(';')
    .map((pair) => pair.trim())
    .filter((pair) => {
      if (pair === '') return false;
      const separator = pair.indexOf('=');
      return (separator === -1 ? pair : pair.slice(0, separator)) !== name;
    });

  return kept.length > 0 ? kept.join('; ') : null;
}
