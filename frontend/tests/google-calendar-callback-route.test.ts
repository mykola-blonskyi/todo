import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@shared/lib/hub-identity', () => ({
  resolveIdentity: vi.fn(),
}));

vi.mock('@shared/lib/graphql-client', () => ({
  graphqlFetch: vi.fn(),
}));

process.env.API_URL = 'https://blonskyi.dev';
process.env.APP_URL = 'https://todo.blonskyi.dev';

const { resolveIdentity } = await import('@shared/lib/hub-identity');
const { graphqlFetch } = await import('@shared/lib/graphql-client');
const { GET } = await import('@/app/api/google/calendar/callback/route');

function callbackRequest(query: string, cookie?: string): NextRequest {
  return new NextRequest(
    `https://todo.blonskyi.dev/api/google/calendar/callback${query}`,
    cookie ? { headers: { cookie } } : undefined,
  );
}

describe('GET /api/google/calendar/callback', () => {
  beforeEach(() => {
    vi.mocked(resolveIdentity).mockReset();
    vi.mocked(graphqlFetch).mockReset();
  });

  it('redirects to settings with an error when code or state is missing', async () => {
    const response = await GET(callbackRequest('?state=abc'));

    const location = new URL(response.headers.get('location')!);
    expect(location.pathname).toBe('/en/settings');
    expect(location.searchParams.get('googleCalendar')).toBe('error');
    expect(resolveIdentity).not.toHaveBeenCalled();
  });

  it('redirects to settings with an error when state does not match the cookie', async () => {
    const response = await GET(
      callbackRequest(
        '?code=abc&state=mismatched',
        'google_oauth_state=expected',
      ),
    );

    const location = new URL(response.headers.get('location')!);
    expect(location.searchParams.get('googleCalendar')).toBe('error');
    expect(resolveIdentity).not.toHaveBeenCalled();
  });

  it('redirects to settings with an error when there is no session', async () => {
    vi.mocked(resolveIdentity).mockResolvedValue(null);

    const response = await GET(
      callbackRequest('?code=abc&state=xyz', 'google_oauth_state=xyz'),
    );

    const location = new URL(response.headers.get('location')!);
    expect(location.searchParams.get('googleCalendar')).toBe('error');
    expect(graphqlFetch).not.toHaveBeenCalled();
  });

  it('exchanges the code and redirects to settings with connected=true on success', async () => {
    vi.mocked(resolveIdentity).mockResolvedValue({
      userId: 'hub-user-1',
      email: 'a@example.com',
    });
    vi.mocked(graphqlFetch).mockResolvedValue({ connectGoogleCalendar: true });

    const response = await GET(
      callbackRequest('?code=auth-code&state=xyz', 'google_oauth_state=xyz'),
    );

    expect(graphqlFetch).toHaveBeenCalledWith(
      expect.stringContaining('connectGoogleCalendar'),
      { code: 'auth-code', redirectUri: expect.any(String) },
      { userId: 'hub-user-1', email: 'a@example.com' },
    );

    const location = new URL(response.headers.get('location')!);
    expect(location.searchParams.get('googleCalendar')).toBe('connected');
    expect(response.headers.get('set-cookie')).toContain(
      'google_oauth_state=;',
    );
  });

  it('redirects to settings with an error when the backend rejects the code', async () => {
    vi.mocked(resolveIdentity).mockResolvedValue({
      userId: 'hub-user-1',
      email: 'a@example.com',
    });
    vi.mocked(graphqlFetch).mockRejectedValue(new Error('rejected'));

    const response = await GET(
      callbackRequest('?code=bad-code&state=xyz', 'google_oauth_state=xyz'),
    );

    const location = new URL(response.headers.get('location')!);
    expect(location.searchParams.get('googleCalendar')).toBe('error');
  });
});
