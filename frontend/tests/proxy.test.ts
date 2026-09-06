import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

const intlMiddlewareMock = vi.fn<(request: NextRequest) => NextResponse>(() =>
  NextResponse.next(),
);

vi.mock('next-intl/middleware', () => ({
  default: () => intlMiddlewareMock,
}));

vi.mock('next-auth/jwt', () => ({
  getToken: vi.fn(),
}));

process.env.APP_URL = 'http://localhost:3000';
process.env.AUTH_SECRET = 'test-secret';

const { default: proxy } = await import('@/proxy');

const getTokenMock = vi.mocked(getToken);

describe('proxy middleware', () => {
  beforeEach(() => {
    intlMiddlewareMock.mockClear();
    getTokenMock.mockReset();
  });

  // Ordering regression (TODO-48): rebuilding a response after next-intl ran
  // dropped the locale header it sets internally, so every non-default-locale
  // URL rendered in English.
  it('sets identity headers on the request before handing off to next-intl middleware', async () => {
    getTokenMock.mockResolvedValue({
      userId: 'login-user-1',
      email: 'user@example.com',
    });
    const request = new NextRequest('http://localhost:3000/uk');

    await proxy(request);

    expect(intlMiddlewareMock).toHaveBeenCalledTimes(1);
    const forwardedRequest = intlMiddlewareMock.mock.calls[0][0];
    expect(forwardedRequest.headers.get('x-user-id')).toBe('login-user-1');
    expect(forwardedRequest.headers.get('x-user-email')).toBe(
      'user@example.com',
    );
  });

  it('redirects to the sign-in page, preserving the exact deep path as callbackUrl, when there is no valid token', async () => {
    getTokenMock.mockResolvedValue(null);
    const request = new NextRequest('http://localhost:3000/uk/lists/42', {
      headers: { cookie: 'NEXT_LOCALE=uk' },
    });

    const response = await proxy(request);

    expect(response?.status).toBe(307);
    const location = new URL(response!.headers.get('location')!);
    expect(location.pathname).toBe('/uk/login');
    expect(location.searchParams.get('callbackUrl')).toBe(
      'http://localhost:3000/uk/lists/42',
    );
    expect(intlMiddlewareMock).not.toHaveBeenCalled();
  });

  // On a genuinely first visit there is no NEXT_LOCALE cookie yet, so deriving
  // the redirect locale from the cookie alone sent /uk/... to /en/login.
  it('takes the redirect locale from the path when no NEXT_LOCALE cookie is set', async () => {
    getTokenMock.mockResolvedValue(null);
    const request = new NextRequest('http://localhost:3000/uk/lists/42');

    const response = await proxy(request);

    const location = new URL(response!.headers.get('location')!);
    expect(location.pathname).toBe('/uk/login');
    expect(location.searchParams.get('callbackUrl')).toBe(
      'http://localhost:3000/uk/lists/42',
    );
  });

  it('falls back to the NEXT_LOCALE cookie when the path carries no locale', async () => {
    getTokenMock.mockResolvedValue(null);
    const request = new NextRequest('http://localhost:3000/lists/42', {
      headers: { cookie: 'NEXT_LOCALE=es' },
    });

    const response = await proxy(request);

    expect(new URL(response!.headers.get('location')!).pathname).toBe(
      '/es/login',
    );
  });

  it('never gates the sign-in page itself, to avoid a redirect loop', async () => {
    getTokenMock.mockResolvedValue(null);
    const request = new NextRequest('http://localhost:3000/uk/login');

    await proxy(request);

    expect(intlMiddlewareMock).toHaveBeenCalledTimes(1);
  });

  // The Privacy Policy page must load logged out: Google's OAuth consent
  // screen links to it for the calendar.events scope, and review has to be
  // able to fetch it without a session.
  it('never gates the privacy policy page, so it loads without signing in', async () => {
    getTokenMock.mockResolvedValue(null);
    const request = new NextRequest('http://localhost:3000/en/privacy');

    await proxy(request);

    expect(intlMiddlewareMock).toHaveBeenCalledTimes(1);
  });
});
