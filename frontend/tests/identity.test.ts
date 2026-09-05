import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

vi.mock('next-auth/jwt', () => ({
  getToken: vi.fn(),
}));

process.env.AUTH_SECRET = 'test-secret';

const { getIdentity } = await import('@/shared/lib/identity');
const getTokenMock = vi.mocked(getToken);

describe('getIdentity', () => {
  beforeEach(() => {
    getTokenMock.mockReset();
  });

  it('returns the identity from a valid token', async () => {
    getTokenMock.mockResolvedValue({
      userId: 'login-user-1',
      email: 'user@example.com',
    });

    const identity = await getIdentity(
      new NextRequest('http://localhost:3000/'),
    );

    expect(identity).toEqual({
      userId: 'login-user-1',
      email: 'user@example.com',
    });
  });

  it('returns null when there is no token', async () => {
    getTokenMock.mockResolvedValue(null);

    expect(
      await getIdentity(new NextRequest('http://localhost:3000/')),
    ).toBeNull();
  });

  it('returns null when the token is missing userId or email', async () => {
    getTokenMock.mockResolvedValue({ userId: 'login-user-1' });

    expect(
      await getIdentity(new NextRequest('http://localhost:3000/')),
    ).toBeNull();
  });
});
