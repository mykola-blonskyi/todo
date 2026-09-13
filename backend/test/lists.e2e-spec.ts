import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { stubHubProjectMembers } from './setup/hub';

interface GraphQLResponse<T> {
  data: T | null;
  errors?: { extensions: { code: string } }[];
}

// Every candidate any test in this file invites, so requireProjectMember
// (Rule 4) finds them on the hub roster.
const HUB_MEMBERS = [
  { hubUserId: 'hub-2', email: 'collab@example.com', name: 'Collaborator' },
];

describe('List (GraphQL)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    stubHubProjectMembers(HUB_MEMBERS);
  });

  afterEach(async () => {
    await app.close();
  });

  function asUser(identitySub: string, email: string) {
    // inviteToList now needs a session cookie too (requireProjectMember).
    return {
      'x-user-id': identitySub,
      'x-user-email': email,
      cookie: `authjs.session-token=${identitySub}-session`,
    };
  }

  async function graphql<T>(query: string, headers: Record<string, string>) {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set(headers)
      .send({ query });
    return res.body as GraphQLResponse<T>;
  }

  async function createList(headers: Record<string, string>, title: string) {
    const body = await graphql<{ createList: { id: string } }>(
      `mutation { createList(title: "${title}") { id } }`,
      headers,
    );
    return body.data!.createList.id;
  }

  it('creates a List for the calling user', async () => {
    const body = await graphql<{
      createList: { id: string; title: string; templateId: string | null };
    }>(
      `
        mutation {
          createList(title: "Groceries") {
            id
            title
            templateId
          }
        }
      `,
      asUser('hub-1', 'owner@example.com'),
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.createList.title).toBe('Groceries');
    expect(body.data?.createList.templateId).toBeNull();
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

  it('renames a List for its owner', async () => {
    const owner = asUser('hub-1', 'owner@example.com');
    const id = await createList(owner, 'Groceries');

    const body = await graphql<{ renameList: { title: string } }>(
      `mutation { renameList(id: "${id}", title: "Weekly groceries") { title } }`,
      owner,
    );

    expect(body.data?.renameList.title).toBe('Weekly groceries');
  });

  it('rejects renaming to an empty or blank title', async () => {
    const owner = asUser('hub-1', 'owner@example.com');
    const id = await createList(owner, 'Groceries');

    const body = await graphql<{ renameList: unknown }>(
      `mutation { renameList(id: "${id}", title: "   ") { title } }`,
      owner,
    );

    expect(body.data).toBeNull();
    expect(body.errors?.[0]).toBeDefined();
  });

  it('denies renameList for a non-owner', async () => {
    const owner = asUser('hub-1', 'owner@example.com');
    const id = await createList(owner, 'Groceries');

    const body = await graphql<{ renameList: unknown }>(
      `mutation { renameList(id: "${id}", title: "Hijacked") { title } }`,
      asUser('hub-2', 'other@example.com'),
    );

    expect(body.data).toBeNull();
    expect(body.errors?.[0]).toBeDefined();
  });

  it('sets a due date on a List for its owner', async () => {
    const owner = asUser('hub-1', 'owner@example.com');
    const id = await createList(owner, 'Groceries');

    const body = await graphql<{ updateListDueDate: { dueDate: string } }>(
      `mutation { updateListDueDate(id: "${id}", dueDate: "2026-09-01T00:00:00.000Z") { dueDate } }`,
      owner,
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.updateListDueDate.dueDate).toBe(
      '2026-09-01T00:00:00.000Z',
    );
  });

  it('clears a List due date by passing null', async () => {
    const owner = asUser('hub-1', 'owner@example.com');
    const id = await createList(owner, 'Groceries');

    await graphql(
      `mutation { updateListDueDate(id: "${id}", dueDate: "2026-09-01T00:00:00.000Z") { id } }`,
      owner,
    );

    const body = await graphql<{ updateListDueDate: { dueDate: null } }>(
      `mutation { updateListDueDate(id: "${id}", dueDate: null) { dueDate } }`,
      owner,
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.updateListDueDate.dueDate).toBeNull();
  });

  it('denies updateListDueDate for a non-owner', async () => {
    const owner = asUser('hub-1', 'owner@example.com');
    const id = await createList(owner, 'Groceries');

    const body = await graphql<{ updateListDueDate: unknown }>(
      `mutation { updateListDueDate(id: "${id}", dueDate: "2026-09-01T00:00:00.000Z") { id } }`,
      asUser('hub-2', 'other@example.com'),
    );

    expect(body.data).toBeNull();
    expect(body.errors?.[0]).toBeDefined();
  });

  it('deletes a List for its owner', async () => {
    const owner = asUser('hub-1', 'owner@example.com');
    const id = await createList(owner, 'Groceries');

    const deleteBody = await graphql<{ deleteList: boolean }>(
      `mutation { deleteList(id: "${id}") }`,
      owner,
    );
    expect(deleteBody.data?.deleteList).toBe(true);

    const readBody = await graphql<{ list: unknown }>(
      `query { list(id: "${id}") { title } }`,
      owner,
    );
    expect(readBody.data).toBeNull();
  });

  it('denies deleteList for a non-owner', async () => {
    const owner = asUser('hub-1', 'owner@example.com');
    const id = await createList(owner, 'Groceries');

    const body = await graphql<{ deleteList: unknown }>(
      `mutation { deleteList(id: "${id}") }`,
      asUser('hub-2', 'other@example.com'),
    );

    expect(body.data).toBeNull();
    expect(body.errors?.[0]).toBeDefined();
  });

  describe('deleteLists (bulk)', () => {
    async function deleteLists(headers: Record<string, string>, ids: string[]) {
      const idList = ids.map((id) => `"${id}"`).join(', ');
      return graphql<{
        deleteLists: { deletedIds: string[]; failedIds: string[] };
      }>(
        `mutation { deleteLists(ids: [${idList}]) { deletedIds failedIds } }`,
        headers,
      );
    }

    it("deletes every one of the caller's own Lists", async () => {
      const owner = asUser('hub-1', 'owner@example.com');
      const first = await createList(owner, 'Groceries');
      const second = await createList(owner, 'Chores');
      const keep = await createList(owner, 'Keep me');

      const body = await deleteLists(owner, [first, second]);

      expect(body.errors).toBeUndefined();
      expect(body.data?.deleteLists.deletedIds.sort()).toEqual(
        [first, second].sort(),
      );
      expect(body.data?.deleteLists.failedIds).toEqual([]);

      const remaining = await graphql<{ myLists: { id: string }[] }>(
        `
          query {
            myLists {
              id
            }
          }
        `,
        owner,
      );
      expect(remaining.data?.myLists).toEqual([{ id: keep }]);
    });

    it("fails per item for someone else's List, without aborting the batch", async () => {
      const owner = asUser('hub-1', 'owner@example.com');
      const other = asUser('hub-2', 'other@example.com');
      const mine = await createList(owner, 'Groceries');
      const theirs = await createList(other, 'Not yours');

      const body = await deleteLists(owner, [theirs, mine]);

      expect(body.errors).toBeUndefined();
      expect(body.data?.deleteLists.deletedIds).toEqual([mine]);
      expect(body.data?.deleteLists.failedIds).toEqual([theirs]);

      const theirLists = await graphql<{ myLists: { id: string }[] }>(
        `
          query {
            myLists {
              id
            }
          }
        `,
        other,
      );
      expect(theirLists.data?.myLists).toEqual([{ id: theirs }]);
    });

    it('fails per item for an unknown id', async () => {
      const owner = asUser('hub-1', 'owner@example.com');
      const mine = await createList(owner, 'Groceries');

      const body = await deleteLists(owner, [
        'ffffffff-ffff-4fff-8fff-ffffffffffff',
        mine,
      ]);

      expect(body.errors).toBeUndefined();
      expect(body.data?.deleteLists.deletedIds).toEqual([mine]);
      expect(body.data?.deleteLists.failedIds).toEqual([
        'ffffffff-ffff-4fff-8fff-ffffffffffff',
      ]);
    });

    it('denies deletion of a List the caller only collaborates on', async () => {
      const owner = asUser('hub-1', 'owner@example.com');
      const collaborator = asUser('hub-2', 'collab@example.com');
      const listId = await createList(owner, 'Shared list');

      const invite = await graphql<{ inviteToList: { id: string } }>(
        `mutation { inviteToList(listId: "${listId}", candidate: {
          hubUserId: "${collaborator['x-user-id']}",
          email: "${collaborator['x-user-email']}",
          name: "Collaborator",
          image: null
        }) { id } }`,
        owner,
      );
      await graphql(
        `mutation { acceptInvite(shareId: "${invite.data!.inviteToList.id}") { id } }`,
        collaborator,
      );

      const body = await deleteLists(collaborator, [listId]);

      expect(body.data?.deleteLists.deletedIds).toEqual([]);
      expect(body.data?.deleteLists.failedIds).toEqual([listId]);
    });

    it('reports a repeated id once, as deleted', async () => {
      const owner = asUser('hub-1', 'owner@example.com');
      const id = await createList(owner, 'Groceries');

      const body = await deleteLists(owner, [id, id]);

      expect(body.data?.deleteLists.deletedIds).toEqual([id]);
      expect(body.data?.deleteLists.failedIds).toEqual([]);
    });

    it('accepts an empty batch', async () => {
      const owner = asUser('hub-1', 'owner@example.com');

      const body = await deleteLists(owner, []);

      expect(body.errors).toBeUndefined();
      expect(body.data?.deleteLists).toEqual({
        deletedIds: [],
        failedIds: [],
      });
    });
  });

  // @nestjs/apollo leaves any status it does not know as INTERNAL_SERVER_ERROR,
  // so "this list does not exist" and "the database is down" reached the
  // caller identically - and the frontend rendered both as "not found".
  it('reports a missing List as NOT_FOUND, not as a server fault', async () => {
    const owner = asUser('hub-1', 'owner@example.com');

    const body = await graphql(
      `
        query {
          list(id: "00000000-0000-0000-0000-000000000000") {
            id
          }
        }
      `,
      owner,
    );

    expect(body.errors?.[0].extensions.code).toBe('NOT_FOUND');
  });
});
