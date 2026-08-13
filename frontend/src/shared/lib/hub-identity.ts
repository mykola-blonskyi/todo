export interface Identity {
  userId: string;
  email: string;
}

// The `.blonskyi.dev` cookie domain doesn't resolve on localhost, and there's
// no way to reach a real deployed hub from local dev (see the hub's own
// boilerplates/subdomain-app.md "Local dev limitation" note, which explicitly
// suggests mocking the validate call in a local-only branch). Gated on
// non-production + an explicit opt-in env var so it can never accidentally
// activate anywhere real.
export function devBypassIdentity(): Identity | null {
  if (
    process.env.NODE_ENV === 'production' ||
    process.env.DEV_BYPASS_AUTH !== 'true'
  ) {
    return null;
  }
  const userId = process.env.DEV_USER_ID;
  const email = process.env.DEV_USER_EMAIL;
  return userId && email ? { userId, email } : null;
}

// Shared by proxy.ts (page requests) and the /api/google/calendar routes
// (which the proxy's matcher deliberately excludes, see proxy.ts) - both need
// to independently resolve the caller's identity from the hub session
// cookie.
export async function resolveIdentity(
  cookieHeader: string,
): Promise<Identity | null> {
  const bypass = devBypassIdentity();
  if (bypass) {
    return bypass;
  }

  const API_URL = process.env.API_URL!;
  const PROJECT_SLUG = process.env.PROJECT_SLUG ?? 'todolist';

  try {
    const res = await fetch(
      `${API_URL}/api/auth/validate?project=${PROJECT_SLUG}`,
      {
        headers: { cookie: cookieHeader },
        cache: 'no-store',
      },
    );

    if (!res.ok) {
      return null;
    }

    const body = (await res.json()) as {
      allowed: boolean;
      userId?: string;
      email?: string;
    };
    return body.allowed && body.userId && body.email
      ? { userId: body.userId, email: body.email }
      : null;
  } catch {
    return null;
  }
}
