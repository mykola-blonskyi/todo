import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { decryptToken } from '../src/google-calendar/token-encryption';
import { testDb } from './setup/db';

interface GraphQLResponse<T> {
  data: T | null;
  errors?: { extensions: { code: string } }[];
}

function mockTokenExchange(body: unknown, ok = true) {
  return jest
    .spyOn(global, 'fetch')
    .mockResolvedValue(
      new Response(JSON.stringify(body), { status: ok ? 200 : 400 }),
    );
}

// Google's revoke endpoint returns an empty body - only the status matters.
function mockRevoke(ok = true) {
  return jest
    .spyOn(global, 'fetch')
    .mockResolvedValue(new Response('', { status: ok ? 200 : 400 }));
}

type FetchSpy = jest.SpiedFunction<typeof fetch>;

function revokeCall(fetchMock: FetchSpy) {
  return fetchMock.mock.calls.find(
    ([url]) => url === 'https://oauth2.googleapis.com/revoke',
  );
}

describe('Google Calendar connect (GraphQL)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.restoreAllMocks();
  });

  function asUser(identitySub: string, email: string) {
    return { 'x-user-id': identitySub, 'x-user-email': email };
  }

  async function graphql<T>(query: string, headers: Record<string, string>) {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set(headers)
      .send({ query });
    return res.body as GraphQLResponse<T>;
  }

  it('exchanges the code and reports googleCalendarConnected as true', async () => {
    const owner = asUser('owner-1', 'owner@example.com');
    mockTokenExchange({
      access_token: 'plain-access-token',
      refresh_token: 'plain-refresh-token',
      expires_in: 3600,
      scope: 'https://www.googleapis.com/auth/calendar.events',
    });

    const connectBody = await graphql<{ connectGoogleCalendar: boolean }>(
      `
        mutation {
          connectGoogleCalendar(
            code: "auth-code"
            redirectUri: "https://todo.blonskyi.dev/api/google/calendar/callback"
          )
        }
      `,
      owner,
    );
    expect(connectBody.errors).toBeUndefined();
    expect(connectBody.data?.connectGoogleCalendar).toBe(true);

    const meBody = await graphql<{ me: { googleCalendarConnected: boolean } }>(
      `
        query {
          me {
            googleCalendarConnected
          }
        }
      `,
      owner,
    );
    expect(meBody.data?.me.googleCalendarConnected).toBe(true);
  });

  it('reports googleCalendarConnected as false before connecting', async () => {
    const owner = asUser('owner-1', 'owner@example.com');

    const meBody = await graphql<{ me: { googleCalendarConnected: boolean } }>(
      `
        query {
          me {
            googleCalendarConnected
          }
        }
      `,
      owner,
    );
    expect(meBody.data?.me.googleCalendarConnected).toBe(false);
  });

  it('encrypts the access and refresh tokens at rest', async () => {
    const owner = asUser('owner-1', 'owner@example.com');
    mockTokenExchange({
      access_token: 'plain-access-token',
      refresh_token: 'plain-refresh-token',
      expires_in: 3600,
      scope: 'https://www.googleapis.com/auth/calendar.events',
    });

    await graphql(
      `
        mutation {
          connectGoogleCalendar(
            code: "auth-code"
            redirectUri: "https://example.com/callback"
          )
        }
      `,
      owner,
    );

    const user = await testDb.user.findUniqueOrThrow({
      where: { identitySub: 'owner-1' },
    });
    const connection = await testDb.googleCalendarConnection.findUniqueOrThrow({
      where: { userId: user.id },
    });

    expect(connection.accessToken).not.toBe('plain-access-token');
    expect(connection.refreshToken).not.toBe('plain-refresh-token');
    expect(decryptToken(connection.accessToken)).toBe('plain-access-token');
    expect(decryptToken(connection.refreshToken)).toBe('plain-refresh-token');
  });

  it('rejects and stores nothing when Google rejects the code', async () => {
    const owner = asUser('owner-1', 'owner@example.com');
    mockTokenExchange({ error: 'invalid_grant' }, false);

    const body = await graphql<{ connectGoogleCalendar: boolean }>(
      `
        mutation {
          connectGoogleCalendar(
            code: "bad-code"
            redirectUri: "https://example.com/callback"
          )
        }
      `,
      owner,
    );

    expect(body.data).toBeNull();
    expect(body.errors?.[0]).toBeDefined();

    const user = await testDb.user.findUniqueOrThrow({
      where: { identitySub: 'owner-1' },
    });
    const connection = await testDb.googleCalendarConnection.findUnique({
      where: { userId: user.id },
    });
    expect(connection).toBeNull();
  });

  it('reconnecting updates the existing connection rather than duplicating it', async () => {
    const owner = asUser('owner-1', 'owner@example.com');

    mockTokenExchange({
      access_token: 'first-access-token',
      refresh_token: 'first-refresh-token',
      expires_in: 3600,
      scope: 'https://www.googleapis.com/auth/calendar.events',
    });
    await graphql(
      `
        mutation {
          connectGoogleCalendar(
            code: "auth-code-1"
            redirectUri: "https://example.com/callback"
          )
        }
      `,
      owner,
    );

    mockTokenExchange({
      access_token: 'second-access-token',
      refresh_token: 'second-refresh-token',
      expires_in: 7200,
      scope: 'https://www.googleapis.com/auth/calendar.events',
    });
    await graphql(
      `
        mutation {
          connectGoogleCalendar(
            code: "auth-code-2"
            redirectUri: "https://example.com/callback"
          )
        }
      `,
      owner,
    );

    const user = await testDb.user.findUniqueOrThrow({
      where: { identitySub: 'owner-1' },
    });
    const connections = await testDb.googleCalendarConnection.findMany({
      where: { userId: user.id },
    });

    expect(connections).toHaveLength(1);
    expect(decryptToken(connections[0].accessToken)).toBe(
      'second-access-token',
    );
  });

  it('keeps the existing refresh token when Google omits one on reconnect', async () => {
    const owner = asUser('owner-1', 'owner@example.com');

    mockTokenExchange({
      access_token: 'first-access-token',
      refresh_token: 'first-refresh-token',
      expires_in: 3600,
      scope: 'https://www.googleapis.com/auth/calendar.events',
    });
    await graphql(
      `
        mutation {
          connectGoogleCalendar(
            code: "auth-code-1"
            redirectUri: "https://example.com/callback"
          )
        }
      `,
      owner,
    );

    mockTokenExchange({
      access_token: 'second-access-token',
      expires_in: 3600,
      scope: 'https://www.googleapis.com/auth/calendar.events',
    });
    const body = await graphql<{ connectGoogleCalendar: boolean }>(
      `
        mutation {
          connectGoogleCalendar(
            code: "auth-code-2"
            redirectUri: "https://example.com/callback"
          )
        }
      `,
      owner,
    );
    expect(body.errors).toBeUndefined();

    const user = await testDb.user.findUniqueOrThrow({
      where: { identitySub: 'owner-1' },
    });
    const connection = await testDb.googleCalendarConnection.findUniqueOrThrow({
      where: { userId: user.id },
    });

    expect(decryptToken(connection.accessToken)).toBe('second-access-token');
    expect(decryptToken(connection.refreshToken)).toBe('first-refresh-token');
  });

  it('rejects with no stored connection when Google grants no refresh token on first connect', async () => {
    const owner = asUser('owner-1', 'owner@example.com');
    mockTokenExchange({
      access_token: 'plain-access-token',
      expires_in: 3600,
      scope: 'https://www.googleapis.com/auth/calendar.events',
    });

    const body = await graphql<{ connectGoogleCalendar: boolean }>(
      `
        mutation {
          connectGoogleCalendar(
            code: "auth-code"
            redirectUri: "https://example.com/callback"
          )
        }
      `,
      owner,
    );

    expect(body.data).toBeNull();
    expect(body.errors?.[0]).toBeDefined();

    const user = await testDb.user.findUniqueOrThrow({
      where: { identitySub: 'owner-1' },
    });
    const connection = await testDb.googleCalendarConnection.findUnique({
      where: { userId: user.id },
    });
    expect(connection).toBeNull();
  });
});

describe('Google Calendar disconnect (GraphQL)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.restoreAllMocks();
  });

  function asUser(identitySub: string, email: string) {
    return { 'x-user-id': identitySub, 'x-user-email': email };
  }

  async function graphql<T>(query: string, headers: Record<string, string>) {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set(headers)
      .send({ query });
    return res.body as GraphQLResponse<T>;
  }

  const CONNECT = `
    mutation {
      connectGoogleCalendar(
        code: "auth-code"
        redirectUri: "https://example.com/callback"
      )
    }
  `;
  const DISCONNECT = `
    mutation {
      disconnectGoogleCalendar
    }
  `;
  const ME = `
    query {
      me {
        googleCalendarConnected
      }
    }
  `;

  async function connect(headers: Record<string, string>) {
    mockTokenExchange({
      access_token: 'plain-access-token',
      refresh_token: 'plain-refresh-token',
      expires_in: 3600,
      scope: 'https://www.googleapis.com/auth/calendar.events',
    });
    const body = await graphql<{ connectGoogleCalendar: boolean }>(
      CONNECT,
      headers,
    );
    expect(body.errors).toBeUndefined();
    return testDb.user.findUniqueOrThrow({
      where: { identitySub: headers['x-user-id'] },
    });
  }

  it('deletes the stored connection and reports googleCalendarConnected as false', async () => {
    const owner = asUser('owner-1', 'owner@example.com');
    const user = await connect(owner);
    mockRevoke();

    const body = await graphql<{ disconnectGoogleCalendar: boolean }>(
      DISCONNECT,
      owner,
    );
    expect(body.errors).toBeUndefined();
    expect(body.data?.disconnectGoogleCalendar).toBe(true);

    const connection = await testDb.googleCalendarConnection.findUnique({
      where: { userId: user.id },
    });
    expect(connection).toBeNull();

    const meBody = await graphql<{ me: { googleCalendarConnected: boolean } }>(
      ME,
      owner,
    );
    expect(meBody.data?.me.googleCalendarConnected).toBe(false);
  });

  it('revokes the grant at Google with the decrypted refresh token', async () => {
    const owner = asUser('owner-1', 'owner@example.com');
    await connect(owner);
    const fetchMock = mockRevoke();
    fetchMock.mockClear();

    await graphql(DISCONNECT, owner);

    const [, init] = revokeCall(fetchMock) ?? [];
    expect(init).toBeDefined();
    expect(init?.method).toBe('POST');
    expect((init?.body as URLSearchParams).get('token')).toBe(
      'plain-refresh-token',
    );
  });

  it('leaves already-synced CalendarSync rows untouched (Rule 27)', async () => {
    const owner = asUser('owner-1', 'owner@example.com');
    const user = await connect(owner);
    const list = await testDb.list.create({
      data: { title: 'Groceries', ownerId: user.id },
    });
    await testDb.calendarSync.create({
      data: {
        userId: user.id,
        listId: list.id,
        googleEventId: 'google-event-1',
        googleCalendarId: 'primary',
      },
    });
    mockRevoke();

    await graphql(DISCONNECT, owner);

    const sync = await testDb.calendarSync.findUnique({
      where: { userId_listId: { userId: user.id, listId: list.id } },
    });
    expect(sync?.googleEventId).toBe('google-event-1');
  });

  it('succeeds without calling Google when nothing is connected', async () => {
    const owner = asUser('owner-1', 'owner@example.com');
    const fetchMock = mockRevoke();

    const body = await graphql<{ disconnectGoogleCalendar: boolean }>(
      DISCONNECT,
      owner,
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.disconnectGoogleCalendar).toBe(true);
    expect(revokeCall(fetchMock)).toBeUndefined();
  });

  it('deletes the stored connection even when Google refuses the revocation', async () => {
    const owner = asUser('owner-1', 'owner@example.com');
    const user = await connect(owner);
    mockRevoke(false);

    const body = await graphql<{ disconnectGoogleCalendar: boolean }>(
      DISCONNECT,
      owner,
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.disconnectGoogleCalendar).toBe(true);
    const connection = await testDb.googleCalendarConnection.findUnique({
      where: { userId: user.id },
    });
    expect(connection).toBeNull();
  });
});

// Rule 29: the User revoked todolist's access from their Google Account, so
// the stored connection is dead but still sitting there claiming otherwise.
describe('Google Calendar revoked grant (GraphQL)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.restoreAllMocks();
  });

  function asUser(identitySub: string, email: string) {
    return { 'x-user-id': identitySub, 'x-user-email': email };
  }

  async function graphql<T>(query: string, headers: Record<string, string>) {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set(headers)
      .send({ query });
    return res.body as GraphQLResponse<T>;
  }

  const CONNECT = `
    mutation {
      connectGoogleCalendar(
        code: "auth-code"
        redirectUri: "https://example.com/callback"
      )
    }
  `;
  const ME = `
    query {
      me {
        googleCalendarConnected
        googleCalendarNeedsReconnect
      }
    }
  `;

  interface MeResponse {
    me: {
      googleCalendarConnected: boolean;
      googleCalendarNeedsReconnect: boolean;
    };
  }

  async function connect(headers: Record<string, string>) {
    mockTokenExchange({
      access_token: 'plain-access-token',
      refresh_token: 'plain-refresh-token',
      expires_in: 3600,
      scope: 'https://www.googleapis.com/auth/calendar.events',
    });
    const body = await graphql<{ connectGoogleCalendar: boolean }>(
      CONNECT,
      headers,
    );
    expect(body.errors).toBeUndefined();
    return testDb.user.findUniqueOrThrow({
      where: { identitySub: headers['x-user-id'] },
    });
  }

  // Forces the next sync through the refresh path rather than reusing the
  // still-valid stored access token.
  async function expireAccessToken(userId: string) {
    await testDb.googleCalendarConnection.update({
      where: { userId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
  }

  async function syncAList(userId: string, headers: Record<string, string>) {
    const list = await testDb.list.create({
      data: {
        title: 'Groceries',
        ownerId: userId,
        dueDate: new Date('2026-09-01T00:00:00.000Z'),
      },
    });
    return graphql<{ syncListToCalendar: boolean }>(
      `mutation { syncListToCalendar(listId: "${list.id}") }`,
      headers,
    );
  }

  it('flags the connection when Google refuses the refresh with invalid_grant', async () => {
    const owner = asUser('owner-1', 'owner@example.com');
    const user = await connect(owner);
    await expireAccessToken(user.id);
    mockTokenExchange({ error: 'invalid_grant' }, false);

    const syncBody = await syncAList(user.id, owner);
    expect(syncBody.errors?.[0]).toBeDefined();

    const connection = await testDb.googleCalendarConnection.findUniqueOrThrow({
      where: { userId: user.id },
    });
    expect(connection.revokedAt).not.toBeNull();

    // The row is deliberately kept, so the UI can ask for a reconnect
    // instead of pretending nothing was ever connected.
    const meBody = await graphql<MeResponse>(ME, owner);
    expect(meBody.data?.me.googleCalendarConnected).toBe(true);
    expect(meBody.data?.me.googleCalendarNeedsReconnect).toBe(true);
  });

  it('flags the connection when the Calendar API itself answers 401', async () => {
    const owner = asUser('owner-1', 'owner@example.com');
    const user = await connect(owner);
    // Access token still valid, so nothing refreshes - a revoke Google
    // applied to the grant surfaces on the events call instead.
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ error: { message: 'Invalid Credentials' } }),
        {
          status: 401,
        },
      ),
    );

    const syncBody = await syncAList(user.id, owner);
    expect(syncBody.errors?.[0]).toBeDefined();

    const meBody = await graphql<MeResponse>(ME, owner);
    expect(meBody.data?.me.googleCalendarNeedsReconnect).toBe(true);
  });

  it('leaves the connection alone when the refresh fails for another reason', async () => {
    const owner = asUser('owner-1', 'owner@example.com');
    const user = await connect(owner);
    await expireAccessToken(user.id);
    // A configuration or transient failure is not the User revoking us -
    // auto-flagging on every 400 is exactly what this ticket rejected.
    mockTokenExchange({ error: 'invalid_client' }, false);

    const syncBody = await syncAList(user.id, owner);
    expect(syncBody.errors?.[0]).toBeDefined();

    const connection = await testDb.googleCalendarConnection.findUniqueOrThrow({
      where: { userId: user.id },
    });
    expect(connection.revokedAt).toBeNull();

    const meBody = await graphql<MeResponse>(ME, owner);
    expect(meBody.data?.me.googleCalendarNeedsReconnect).toBe(false);
  });

  it('clears the flag when the User reconnects', async () => {
    const owner = asUser('owner-1', 'owner@example.com');
    const user = await connect(owner);
    await expireAccessToken(user.id);
    mockTokenExchange({ error: 'invalid_grant' }, false);
    await syncAList(user.id, owner);

    await connect(owner);

    const connection = await testDb.googleCalendarConnection.findUniqueOrThrow({
      where: { userId: user.id },
    });
    expect(connection.revokedAt).toBeNull();

    const meBody = await graphql<MeResponse>(ME, owner);
    expect(meBody.data?.me.googleCalendarNeedsReconnect).toBe(false);
  });

  it('reports no reconnect needed while nothing is connected at all', async () => {
    const owner = asUser('owner-1', 'owner@example.com');

    const meBody = await graphql<MeResponse>(ME, owner);
    expect(meBody.data?.me.googleCalendarConnected).toBe(false);
    expect(meBody.data?.me.googleCalendarNeedsReconnect).toBe(false);
  });
});
