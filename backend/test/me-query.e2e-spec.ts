import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { testDb } from './setup/db';

interface MeQueryResponse {
  data: {
    me: {
      id: string;
      email: string;
      name: string | null;
      locale: string;
      theme: string;
      palette: string;
      layout: string;
    };
  } | null;
  errors?: { extensions: { code: string } }[];
}

describe('me query (GraphQL)', () => {
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
  });

  async function meQuery(headers: Record<string, string>) {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set(headers)
      .send({
        query: 'query { me { id email name locale theme palette layout } }',
      });
    return res.body as MeQueryResponse;
  }

  it('rejects a request with no trusted identity headers', async () => {
    const body = await meQuery({});

    expect(body.data).toBeNull();
    expect(body.errors?.[0].extensions.code).toBe('UNAUTHENTICATED');
  });

  it('creates the local shadow User row on first request', async () => {
    const body = await meQuery({
      'x-user-id': 'hub-1',
      'x-user-email': 'owner@example.com',
      'x-user-name': 'Owner',
    });

    expect(body.errors).toBeUndefined();
    expect(body.data?.me).toMatchObject({
      email: 'owner@example.com',
      name: 'Owner',
      locale: 'en',
      theme: 'light',
      palette: 'classic',
      layout: 'workspace',
    });

    const rows = await testDb.user.findMany({
      where: { identitySub: 'hub-1' },
    });
    expect(rows).toHaveLength(1);
  });

  it('resolves the same row on a repeat request - no duplicate created', async () => {
    await meQuery({
      'x-user-id': 'hub-1',
      'x-user-email': 'owner@example.com',
    });
    const second = await meQuery({
      'x-user-id': 'hub-1',
      'x-user-email': 'owner@example.com',
    });

    const rows = await testDb.user.findMany({
      where: { identitySub: 'hub-1' },
    });

    expect(rows).toHaveLength(1);
    expect(second.data?.me.id).toBe(rows[0].id);
  });

  it('leaves previously-set optional fields untouched when a later request omits them', async () => {
    await meQuery({
      'x-user-id': 'hub-1',
      'x-user-email': 'owner@example.com',
      'x-user-name': 'Owner',
    });

    const second = await meQuery({
      'x-user-id': 'hub-1',
      'x-user-email': 'owner@example.com',
    });

    expect(second.data?.me.name).toBe('Owner');
  });

  // findOrCreateCandidate keys a share/template candidate's row by the hub's
  // own id (TODO-54), not a login `sub`. Without reconciling on email, that
  // person's first real sign-in matches no row, falls through to create, and
  // dies on User.email's unique constraint (ADR-016).
  describe('reconciling a pre-existing candidate row on first real sign-in', () => {
    it('reattaches the existing row by email, preserving its id and associations', async () => {
      const candidate = await testDb.user.create({
        data: { identitySub: 'hub-user-7', email: 'shared@example.com' },
      });
      const owner = await testDb.user.create({
        data: { identitySub: 'login-owner', email: 'owner@example.com' },
      });
      const list = await testDb.list.create({
        data: { title: 'Groceries', ownerId: owner.id },
      });
      await testDb.listShare.create({
        data: { listId: list.id, userId: candidate.id },
      });

      const body = await meQuery({
        'x-user-id': 'login-sub-7',
        'x-user-email': 'shared@example.com',
        'x-user-name': 'Shared',
      });

      expect(body.errors).toBeUndefined();
      expect(body.data?.me.id).toBe(candidate.id);

      const rows = await testDb.user.findMany({
        where: { email: 'shared@example.com' },
      });
      expect(rows).toHaveLength(1);
      expect(rows[0].identitySub).toBe('login-sub-7');
      expect(rows[0].name).toBe('Shared');

      const shares = await testDb.listShare.findMany({
        where: { userId: candidate.id },
      });
      expect(shares).toHaveLength(1);
    });

    it('still creates a row normally when nothing pre-exists for that email', async () => {
      const body = await meQuery({
        'x-user-id': 'login-sub-8',
        'x-user-email': 'fresh@example.com',
      });

      expect(body.errors).toBeUndefined();
      const rows = await testDb.user.findMany({
        where: { identitySub: 'login-sub-8' },
      });
      expect(rows).toHaveLength(1);
      expect(rows[0].email).toBe('fresh@example.com');
    });

    it('updates in place when a row already carries the matching identitySub', async () => {
      const existing = await testDb.user.create({
        data: { identitySub: 'login-sub-9', email: 'stable@example.com' },
      });

      const body = await meQuery({
        'x-user-id': 'login-sub-9',
        'x-user-email': 'stable@example.com',
        'x-user-name': 'Stable',
      });

      expect(body.data?.me.id).toBe(existing.id);
      const row = await testDb.user.findUniqueOrThrow({
        where: { id: existing.id },
      });
      expect(row.identitySub).toBe('login-sub-9');
      expect(row.name).toBe('Stable');
    });
  });

  it('records a percent-encoded name and image on the User row', async () => {
    const body = await meQuery({
      'x-user-id': 'hub-1',
      'x-user-email': 'owner@example.com',
      'x-user-name': encodeURIComponent('Микола Блонський'),
      'x-user-image': encodeURIComponent('https://example.test/a b.png'),
    });

    expect(body.errors).toBeUndefined();
    expect(body.data?.me.name).toBe('Микола Блонський');
    const row = await testDb.user.findUniqueOrThrow({
      where: { identitySub: 'hub-1' },
    });
    expect(row.image).toBe('https://example.test/a b.png');
  });

  it('ignores a name that is not decodable rather than failing the request', async () => {
    const body = await meQuery({
      'x-user-id': 'hub-1',
      'x-user-email': 'owner@example.com',
      'x-user-name': '%E0%A4%A',
    });

    expect(body.errors).toBeUndefined();
    expect(body.data?.me.name).toBeNull();
  });
});
