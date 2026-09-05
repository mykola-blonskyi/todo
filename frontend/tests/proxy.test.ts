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

// Regression test for TODO-48: proxy.ts used to build a brand-new
// NextResponse from the *original* request.headers after calling
// next-intl's middleware, discarding the header next-intl's own middleware
// sets on the request it forwards internally. getRequestConfig couldn't see
// the resolved locale as a result, so every non-default-locale URL rendered
// with the default locale's messages. The fix is to set custom headers on
// the request *before* handing it to next-intl's middleware - this asserts
// that ordering directly, since it's invisible to a component-level test.
describe('proxy middleware', () => {
  beforeEach(() => {
    intlMiddlewareMock.mockClear();
    getTokenMock.mockReset();
  });

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

  it('never gates the sign-in page itself, to avoid a redirect loop', async () => {
    getTokenMock.mockResolvedValue(null);
    const request = new NextRequest('http://localhost:3000/uk/login');

    await proxy(request);

    expect(intlMiddlewareMock).toHaveBeenCalledTimes(1);
  });
});
