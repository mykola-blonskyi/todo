import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

interface GraphQLResponse<T> {
  data: T | null;
  errors?: { extensions: { code: string } }[];
}

describe('List (GraphQL)', () => {
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

  function asUser(hubUserId: string, email: string) {
    return { 'x-user-id': hubUserId, 'x-user-email': email };
  }

  async function graphql<T>(query: string, headers: Record<string, string>) {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set(headers)
      .send({ query });
    return res.body as GraphQLResponse<T>;
  }

  it('creates a List for the calling user', async () => {
    const body = await graphql<{ createList: { id: string; title: string } }>(
      `
        mutation {
          createList(title: "Groceries") {
            id
            title
          }
        }
      `,
      asUser('hub-1', 'owner@example.com'),
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.createList.title).toBe('Groceries');
  });

  it('rejects an empty or blank title', async () => {
    const body = await graphql<{ createList: unknown }>(
      `
        mutation {
          createList(title: "   ") {
            id
          }
        }
      `,
      asUser('hub-1', 'owner@example.com'),
    );

    expect(body.data).toBeNull();
    expect(body.errors?.[0]).toBeDefined();
  });

  it("myLists returns only the calling user's own Lists", async () => {
    await graphql(
      `
        mutation {
          createList(title: "Owner list") {
            id
          }
        }
      `,
      asUser('hub-1', 'owner@example.com'),
    );
    await graphql(
      `
        mutation {
          createList(title: "Other list") {
            id
          }
        }
      `,
      asUser('hub-2', 'other@example.com'),
    );

    const body = await graphql<{ myLists: { title: string }[] }>(
      `
        query {
          myLists {
            title
          }
        }
      `,
      asUser('hub-1', 'owner@example.com'),
    );

    expect(body.data?.myLists).toEqual([{ title: 'Owner list' }]);
  });

  it('list(id) returns the List for its owner', async () => {
    const created = await graphql<{ createList: { id: string } }>(
      `
        mutation {
          createList(title: "Groceries") {
            id
          }
        }
      `,
      asUser('hub-1', 'owner@example.com'),
    );
    const id = created.data!.createList.id;

    const body = await graphql<{ list: { title: string } }>(
      `query { list(id: "${id}") { title } }`,
      asUser('hub-1', 'owner@example.com'),
    );

    expect(body.data?.list.title).toBe('Groceries');
  });

  it('denies list(id) for a non-owner', async () => {
    const created = await graphql<{ createList: { id: string } }>(
      `
        mutation {
          createList(title: "Groceries") {
            id
          }
        }
      `,
      asUser('hub-1', 'owner@example.com'),
    );
    const id = created.data!.createList.id;

    const body = await graphql<{ list: unknown }>(
      `query { list(id: "${id}") { title } }`,
      asUser('hub-2', 'other@example.com'),
    );

    expect(body.data).toBeNull();
    expect(body.errors?.[0]).toBeDefined();
  });

  it('denies list(id) for a non-existent id', async () => {
    const body = await graphql<{ list: unknown }>(
      `
        query {
          list(id: "00000000-0000-0000-0000-000000000000") {
            title
          }
        }
      `,
      asUser('hub-1', 'owner@example.com'),
    );

    expect(body.data).toBeNull();
    expect(body.errors?.[0]).toBeDefined();
  });
});
