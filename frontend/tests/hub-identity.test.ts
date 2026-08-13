import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { devBypassIdentity, resolveIdentity } from '@/shared/lib/hub-identity';

describe('devBypassIdentity', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns the dev identity when bypass is enabled outside production', () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('DEV_BYPASS_AUTH', 'true');
    vi.stubEnv('DEV_USER_ID', 'dev-user-1');
    vi.stubEnv('DEV_USER_EMAIL', 'dev@example.com');

    expect(devBypassIdentity()).toEqual({
      userId: 'dev-user-1',
      email: 'dev@example.com',
    });
  });

  it('returns null when DEV_BYPASS_AUTH is not set to true', () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('DEV_BYPASS_AUTH', 'false');

    expect(devBypassIdentity()).toBeNull();
  });

  it('returns null in production even if DEV_BYPASS_AUTH is set', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DEV_BYPASS_AUTH', 'true');
    vi.stubEnv('DEV_USER_ID', 'dev-user-1');
    vi.stubEnv('DEV_USER_EMAIL', 'dev@example.com');

    expect(devBypassIdentity()).toBeNull();
  });
});

describe('resolveIdentity', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('DEV_BYPASS_AUTH', 'false');
    vi.stubEnv('API_URL', 'https://blonskyi.dev');
    vi.stubEnv('PROJECT_SLUG', 'todo');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('returns the identity when the hub allows the session', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          allowed: true,
          userId: 'hub-user-1',
          email: 'a@example.com',
        }),
      ),
    );

    const identity = await resolveIdentity('authjs.session-token=abc');

    expect(identity).toEqual({ userId: 'hub-user-1', email: 'a@example.com' });
  });

  it('returns null when the hub disallows the session', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ allowed: false })),
    );

    expect(await resolveIdentity('authjs.session-token=abc')).toBeNull();
  });

  it('returns null when the hub responds with a non-ok status', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(null, { status: 401 }),
    );

    expect(await resolveIdentity('')).toBeNull();
  });

  it('returns null when the hub request throws', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'));

    expect(await resolveIdentity('')).toBeNull();
  });
});
