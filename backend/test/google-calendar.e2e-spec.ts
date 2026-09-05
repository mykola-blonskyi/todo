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
