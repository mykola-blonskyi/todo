import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddlewareMock = vi.fn<(request: NextRequest) => NextResponse>(() =>
  NextResponse.next(),
);

vi.mock('next-intl/middleware', () => ({
  default: () => intlMiddlewareMock,
}));

vi.mock('next-auth/jwt', () => ({
  getToken: vi.fn(),
}));

process.env.DEV_BYPASS_AUTH = 'true';
process.env.DEV_USER_ID = 'dev-user-1';
process.env.DEV_USER_EMAIL = 'dev@example.com';
process.env.API_URL = 'https://blonskyi.dev';
process.env.APP_URL = 'http://localhost:3000';
process.env.AUTH_SECRET = 'test-secret';

const { default: proxy } = await import('@/proxy');

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
  });

  it('sets identity headers on the request before handing off to next-intl middleware', async () => {
    const request = new NextRequest('http://localhost:3000/uk');

    await proxy(request);

    expect(intlMiddlewareMock).toHaveBeenCalledTimes(1);
    const forwardedRequest = intlMiddlewareMock.mock.calls[0][0];
    expect(forwardedRequest.headers.get('x-user-id')).toBe('dev-user-1');
    expect(forwardedRequest.headers.get('x-user-email')).toBe(
      'dev@example.com',
    );
  });
});
