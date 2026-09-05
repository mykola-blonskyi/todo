import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@shared/lib/identity', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@shared/lib/identity')>()),
  getIdentity: vi.fn(),
}));

process.env.APP_URL = 'https://todo.blonskyi.dev';
process.env.GOOGLE_CLIENT_ID = 'test-client-id';

const { getIdentity } = await import('@shared/lib/identity');
const { GET } = await import('@/app/api/google/calendar/connect/route');

describe('GET /api/google/calendar/connect', () => {
  beforeEach(() => {
    vi.mocked(getIdentity).mockReset();
  });

  it('redirects to todolist login when there is no session', async () => {
    vi.mocked(getIdentity).mockResolvedValue(null);

    const response = await GET(
      new NextRequest('https://todo.blonskyi.dev/api/google/calendar/connect'),
    );

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get('location')!);
    expect(location.origin).toBe('https://todo.blonskyi.dev');
    expect(location.pathname).toBe('/en/login');
    expect(location.searchParams.get('callbackUrl')).toBe(
      'https://todo.blonskyi.dev/en/settings',
    );
  });

  it('redirects to Google with the correct auth params and sets a state cookie', async () => {
    vi.mocked(getIdentity).mockResolvedValue({
      userId: 'login-user-1',
      email: 'a@example.com',
    });

    const response = await GET(
      new NextRequest('https://todo.blonskyi.dev/api/google/calendar/connect'),
    );

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get('location')!);
    expect(location.origin).toBe('https://accounts.google.com');
    expect(location.pathname).toBe('/o/oauth2/v2/auth');
    expect(location.searchParams.get('client_id')).toBe('test-client-id');
    expect(location.searchParams.get('redirect_uri')).toBe(
      'https://todo.blonskyi.dev/api/google/calendar/callback',
    );
    expect(location.searchParams.get('response_type')).toBe('code');
    expect(location.searchParams.get('access_type')).toBe('offline');
    expect(location.searchParams.get('prompt')).toBe('consent');
    expect(location.searchParams.get('state')).toBeTruthy();

    const setCookie = response.headers.get('set-cookie');
    expect(setCookie).toContain('google_oauth_state=');
    expect(setCookie).toContain('HttpOnly');
  });
});
