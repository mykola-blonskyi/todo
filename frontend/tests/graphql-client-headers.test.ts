import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
  headers: () => Promise.resolve(new Headers()),
}));

const getServerIdentity = vi.fn();
vi.mock('@shared/lib/server-identity', () => ({
  getServerIdentity: () => getServerIdentity() as unknown,
}));

const fetchMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  process.env.BACKEND_URL = 'http://backend.test/graphql';
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ data: { ok: true } })),
  );
});

function sentHeaders() {
  return (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<
    string,
    string
  >;
}

describe('graphqlFetch identity headers', () => {
  it('percent-encodes the name, which a header value cannot carry raw', async () => {
    getServerIdentity.mockResolvedValue({
      userId: 'sub-1',
      email: 'owner@example.com',
      name: 'Микола Блонський',
      image: 'https://example.test/a b.png',
    });
    const { graphqlFetch } = await import('@shared/lib/graphql-client');

    await graphqlFetch('query { me { id } }');

    const headers = sentHeaders();
    expect(headers['x-user-name']).toBe(encodeURIComponent('Микола Блонський'));
    expect(headers['x-user-image']).toBe(
      encodeURIComponent('https://example.test/a b.png'),
    );
  });

  it('sends a real request with those headers, rather than throwing on them', async () => {
    getServerIdentity.mockResolvedValue({
      userId: 'sub-1',
      email: 'owner@example.com',
      name: 'Микола',
    });
    const { graphqlFetch } = await import('@shared/lib/graphql-client');

    await expect(graphqlFetch('query { me { id } }')).resolves.toEqual({
      ok: true,
    });
    expect(() => new Headers(sentHeaders())).not.toThrow();
  });

  it('omits them when the session carries neither', async () => {
    getServerIdentity.mockResolvedValue({
      userId: 'sub-1',
      email: 'owner@example.com',
    });
    const { graphqlFetch } = await import('@shared/lib/graphql-client');

    await graphqlFetch('query { me { id } }');

    expect(sentHeaders()['x-user-name']).toBeUndefined();
    expect(sentHeaders()['x-user-image']).toBeUndefined();
  });
});
