// One definition of todolist's own session cookie, shared by the write side
// (auth.ts's cookies.sessionToken) and the read side (identity.ts's getToken)
// - both must agree exactly.
//
// Deliberately not Auth.js's default `authjs.session-token`: that is the name
// the hub sets for `.blonskyi.dev`, so the browser sends it here too. A Cookie
// header carries no `Domain`, and the parser keeps the first of two identical
// names, so a same-named cookie would silently shadow this app's.
export const SESSION_COOKIE_NAME = 'todolist.session-token';
export const SESSION_COOKIE_SECURE = process.env.NODE_ENV === 'production';

// The hub's own session cookie, still Auth.js's default name on its side.
export const HUB_SESSION_COOKIE_NAME = 'authjs.session-token';

// Picks the hub's session cookie out of a raw `cookie` header, dropping
// everything else, and returns null when it isn't there. Auth.js chunks a
// token past ~4096 bytes into `.0`/`.1`/..., so those count too.
export function hubSessionCookie(cookieHeader: string): string | null {
  const kept = cookieHeader
    .split(';')
    .map((pair) => pair.trim())
    .filter((pair) => {
      const separator = pair.indexOf('=');
      const name = separator === -1 ? pair : pair.slice(0, separator);
      return (
        name === HUB_SESSION_COOKIE_NAME ||
        name.startsWith(`${HUB_SESSION_COOKIE_NAME}.`)
      );
    });

  return kept.length > 0 ? kept.join('; ') : null;
}
