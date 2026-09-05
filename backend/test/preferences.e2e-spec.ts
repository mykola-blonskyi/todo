import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { testDb } from './setup/db';

interface GraphQLResponse<T> {
  data: T | null;
  errors?: { extensions: { code: string } }[];
}

describe('Theme/locale preferences (GraphQL)', () => {
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

  it("persists the caller's own theme", async () => {
    const owner = asUser('hub-1', 'owner@example.com');

    const body = await graphql<{ updateTheme: { theme: string } }>(
      `
        mutation {
          updateTheme(theme: dark) {
            theme
          }
        }
      `,
      owner,
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.updateTheme.theme).toBe('dark');

    const row = await testDb.user.findUniqueOrThrow({
      where: { identitySub: 'hub-1' },
    });
    expect(row.theme).toBe('dark');
  });

  it("persists the caller's own locale", async () => {
    const owner = asUser('hub-1', 'owner@example.com');

    const body = await graphql<{ updateLocale: { locale: string } }>(
      `
        mutation {
          updateLocale(locale: uk) {
            locale
          }
        }
      `,
      owner,
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.updateLocale.locale).toBe('uk');

    const row = await testDb.user.findUniqueOrThrow({
      where: { identitySub: 'hub-1' },
    });
    expect(row.locale).toBe('uk');
  });

  it("only ever updates the caller's own User row", async () => {
    const owner = asUser('hub-1', 'owner@example.com');
    const other = asUser('hub-2', 'other@example.com');

    await graphql(
      `
        mutation {
          updateTheme(theme: dark) {
            id
          }
        }
      `,
      owner,
    );
    await graphql(
      `
        mutation {
          updateTheme(theme: light) {
            id
          }
        }
      `,
      other,
    );

    const ownerRow = await testDb.user.findUniqueOrThrow({
      where: { identitySub: 'hub-1' },
    });
    const otherRow = await testDb.user.findUniqueOrThrow({
      where: { identitySub: 'hub-2' },
    });
    expect(ownerRow.theme).toBe('dark');
    expect(otherRow.theme).toBe('light');
  });

  it('rejects updateTheme/updateLocale without trusted identity headers', async () => {
    const themeBody = await graphql<{ updateTheme: unknown }>(
      `
        mutation {
          updateTheme(theme: dark) {
            id
          }
        }
      `,
      {},
    );
    expect(themeBody.data).toBeNull();
    expect(themeBody.errors?.[0].extensions.code).toBe('UNAUTHENTICATED');

    const localeBody = await graphql<{ updateLocale: unknown }>(
      `
        mutation {
          updateLocale(locale: uk) {
            id
          }
        }
      `,
      {},
    );
    expect(localeBody.data).toBeNull();
    expect(localeBody.errors?.[0].extensions.code).toBe('UNAUTHENTICATED');
  });
});
