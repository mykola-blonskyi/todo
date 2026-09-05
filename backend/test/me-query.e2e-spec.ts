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
      .send({ query: 'query { me { id email name locale theme } }' });
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
});
