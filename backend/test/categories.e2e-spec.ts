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

describe('Category CRUD (GraphQL)', () => {
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

  async function createCategory(headers: Record<string, string>, name: string) {
    const body = await graphql<{ createCategory: { id: string } }>(
      `mutation { createCategory(name: "${name}") { id } }`,
      headers,
    );
    return body.data!.createCategory.id;
  }

  describe('createCategory', () => {
    it('creates a Category for the caller', async () => {
      const owner = asUser('owner-1', 'owner@example.com');

      const body = await graphql<{
        createCategory: { name: string };
      }>(
        `
          mutation {
            createCategory(name: "Work") {
              name
            }
          }
        `,
        owner,
      );

      expect(body.errors).toBeUndefined();
      expect(body.data?.createCategory.name).toBe('Work');
    });

    it('rejects an empty or blank name', async () => {
      const owner = asUser('owner-1', 'owner@example.com');

      const body = await graphql<{ createCategory: unknown }>(
        `
          mutation {
            createCategory(name: "   ") {
              id
            }
          }
        `,
        owner,
      );

      expect(body.data).toBeNull();
      expect(body.errors?.[0]).toBeDefined();
    });

    it('rejects a duplicate name for the same owner', async () => {
      const owner = asUser('owner-1', 'owner@example.com');
      await createCategory(owner, 'Work');

      const body = await graphql<{ createCategory: unknown }>(
        `
          mutation {
            createCategory(name: "Work") {
              id
            }
          }
        `,
        owner,
      );

      expect(body.data).toBeNull();
      expect(body.errors?.[0]).toBeDefined();
    });

    it('allows two different owners to have a category with the same name', async () => {
      const owner = asUser('owner-1', 'owner@example.com');
      const otherOwner = asUser('owner-2', 'other@example.com');
      await createCategory(owner, 'Work');

      const body = await graphql<{ createCategory: { name: string } }>(
        `
          mutation {
            createCategory(name: "Work") {
              name
            }
          }
        `,
        otherOwner,
      );

      expect(body.errors).toBeUndefined();
      expect(body.data?.createCategory.name).toBe('Work');
    });
  });

  describe('renameCategory', () => {
    it('renames a Category for its owner', async () => {
      const owner = asUser('owner-1', 'owner@example.com');
      const id = await createCategory(owner, 'Work');

      const body = await graphql<{ renameCategory: { name: string } }>(
        `mutation { renameCategory(id: "${id}", name: "Personal") { name } }`,
        owner,
      );

      expect(body.errors).toBeUndefined();
      expect(body.data?.renameCategory.name).toBe('Personal');
    });

    it('allows renaming to its own current name (no-op collision)', async () => {
      const owner = asUser('owner-1', 'owner@example.com');
      const id = await createCategory(owner, 'Work');

      const body = await graphql<{ renameCategory: { name: string } }>(
        `mutation { renameCategory(id: "${id}", name: "Work") { name } }`,
        owner,
      );

      expect(body.errors).toBeUndefined();
      expect(body.data?.renameCategory.name).toBe('Work');
    });

    it("rejects renaming to a name that collides with another of the same owner's categories", async () => {
      const owner = asUser('owner-1', 'owner@example.com');
      await createCategory(owner, 'Work');
      const id = await createCategory(owner, 'Personal');

      const body = await graphql<{ renameCategory: unknown }>(
        `mutation { renameCategory(id: "${id}", name: "Work") { id } }`,
        owner,
      );

      expect(body.data).toBeNull();
      expect(body.errors?.[0]).toBeDefined();
    });

    it('denies renameCategory for a non-owner', async () => {
      const owner = asUser('owner-1', 'owner@example.com');
      const id = await createCategory(owner, 'Work');

      const body = await graphql<{ renameCategory: unknown }>(
        `mutation { renameCategory(id: "${id}", name: "Hijacked") { id } }`,
        asUser('stranger-1', 'stranger@example.com'),
      );

      expect(body.data).toBeNull();
      expect(body.errors?.[0]).toBeDefined();
    });
  });

  describe('deleteCategory', () => {
    it('deletes a Category for its owner', async () => {
      const owner = asUser('owner-1', 'owner@example.com');
      const id = await createCategory(owner, 'Work');

      const body = await graphql<{ deleteCategory: boolean }>(
        `mutation { deleteCategory(id: "${id}") }`,
        owner,
      );

      expect(body.errors).toBeUndefined();
      expect(body.data?.deleteCategory).toBe(true);

      const listBody = await graphql<{
        myCategories: { id: string }[];
      }>(
        `
          query {
            myCategories {
              id
            }
          }
        `,
        owner,
      );
      expect(listBody.data?.myCategories).toHaveLength(0);
    });

    it('denies deleteCategory for a non-owner', async () => {
      const owner = asUser('owner-1', 'owner@example.com');
      const id = await createCategory(owner, 'Work');

      const body = await graphql<{ deleteCategory: unknown }>(
        `mutation { deleteCategory(id: "${id}") }`,
        asUser('stranger-1', 'stranger@example.com'),
      );

      expect(body.data).toBeNull();
      expect(body.errors?.[0]).toBeDefined();
    });
  });

  describe('deleteCategories (bulk)', () => {
    async function createList(headers: Record<string, string>, title: string) {
      const body = await graphql<{ createList: { id: string } }>(
        `mutation { createList(title: "${title}") { id } }`,
        headers,
      );
      return body.data!.createList.id;
    }

    async function assignListCategory(
      headers: Record<string, string>,
      listId: string,
      categoryId: string,
    ) {
      return graphql<{ assignListCategory: boolean }>(
        `mutation { assignListCategory(listId: "${listId}", categoryId: "${categoryId}") }`,
        headers,
      );
    }

    async function deleteCategories(
      headers: Record<string, string>,
      ids: string[],
    ) {
      const idList = ids.map((id) => `"${id}"`).join(', ');
      return graphql<{
        deleteCategories: { deletedIds: string[]; failedIds: string[] };
      }>(
        `mutation { deleteCategories(ids: [${idList}]) { deletedIds failedIds } }`,
        headers,
      );
    }

    it("deletes every one of the caller's own Categories", async () => {
      const owner = asUser('owner-1', 'owner@example.com');
      const work = await createCategory(owner, 'Work');
      const home = await createCategory(owner, 'Home');
      const keep = await createCategory(owner, 'Keep me');

      const body = await deleteCategories(owner, [work, home]);

      expect(body.errors).toBeUndefined();
      expect(body.data?.deleteCategories.deletedIds.sort()).toEqual(
        [work, home].sort(),
      );
      expect(body.data?.deleteCategories.failedIds).toEqual([]);

      const remaining = await graphql<{ myCategories: { id: string }[] }>(
        `
          query {
            myCategories {
              id
            }
          }
        `,
        owner,
      );
      expect(remaining.data?.myCategories).toEqual([{ id: keep }]);
    });

    it("fails per item for someone else's Category, without aborting the batch", async () => {
      const owner = asUser('owner-1', 'owner@example.com');
      const other = asUser('owner-2', 'other@example.com');
      const mine = await createCategory(owner, 'Work');
      const theirs = await createCategory(other, 'Not yours');

      const body = await deleteCategories(owner, [theirs, mine]);

      expect(body.errors).toBeUndefined();
      expect(body.data?.deleteCategories.deletedIds).toEqual([mine]);
      expect(body.data?.deleteCategories.failedIds).toEqual([theirs]);

      const theirCategories = await graphql<{ myCategories: { id: string }[] }>(
        `
          query {
            myCategories {
              id
            }
          }
        `,
        other,
      );
      expect(theirCategories.data?.myCategories).toEqual([{ id: theirs }]);
    });

    it('fails per item for an unknown id', async () => {
      const owner = asUser('owner-1', 'owner@example.com');
      const mine = await createCategory(owner, 'Work');

      const body = await deleteCategories(owner, [
        'ffffffff-ffff-4fff-8fff-ffffffffffff',
        mine,
      ]);

      expect(body.errors).toBeUndefined();
      expect(body.data?.deleteCategories.deletedIds).toEqual([mine]);
      expect(body.data?.deleteCategories.failedIds).toEqual([
        'ffffffff-ffff-4fff-8fff-ffffffffffff',
      ]);
    });

    it('reports a repeated id once, as deleted', async () => {
      const owner = asUser('owner-1', 'owner@example.com');
      const id = await createCategory(owner, 'Work');

      const body = await deleteCategories(owner, [id, id]);

      expect(body.data?.deleteCategories.deletedIds).toEqual([id]);
      expect(body.data?.deleteCategories.failedIds).toEqual([]);
    });

    it('accepts an empty batch', async () => {
      const owner = asUser('owner-1', 'owner@example.com');

      const body = await deleteCategories(owner, []);

      expect(body.errors).toBeUndefined();
      expect(body.data?.deleteCategories).toEqual({
        deletedIds: [],
        failedIds: [],
      });
    });

    it('leaves the assigned Lists in place, merely uncategorized', async () => {
      const owner = asUser('owner-1', 'owner@example.com');
      const work = await createCategory(owner, 'Work');
      const home = await createCategory(owner, 'Home');
      const workList = await createList(owner, 'Launch plan');
      const homeList = await createList(owner, 'Groceries');
      await assignListCategory(owner, workList, work);
      await assignListCategory(owner, homeList, home);

      const body = await deleteCategories(owner, [work, home]);
      expect(body.data?.deleteCategories.failedIds).toEqual([]);

      const remaining = await graphql<{
        myLists: { id: string; myCategory: { id: string } | null }[];
      }>(
        `
          query {
            myLists {
              id
              myCategory {
                id
              }
            }
          }
        `,
        owner,
      );
      expect(remaining.data?.myLists.map((list) => list.id).sort()).toEqual(
        [workList, homeList].sort(),
      );
      expect(
        remaining.data?.myLists.every((list) => list.myCategory === null),
      ).toBe(true);

      const assignments = await testDb.listCategoryAssignment.findMany({
        where: { listId: { in: [workList, homeList] } },
      });
      expect(assignments).toHaveLength(0);
    });
  });

  describe('myCategories', () => {
    it("returns only the caller's own categories, alphabetically", async () => {
      const owner = asUser('owner-1', 'owner@example.com');
      const otherOwner = asUser('owner-2', 'other@example.com');
      await createCategory(owner, 'Work');
      await createCategory(owner, 'Home');
      await createCategory(otherOwner, "Other person's category");

      const body = await graphql<{
        myCategories: { name: string }[];
      }>(
        `
          query {
            myCategories {
              name
            }
          }
        `,
        owner,
      );

      expect(body.errors).toBeUndefined();
      expect(body.data?.myCategories.map((c) => c.name)).toEqual([
        'Home',
        'Work',
      ]);
    });

    it('returns an empty list for a caller with no categories', async () => {
      const owner = asUser('owner-1', 'owner@example.com');

      const body = await graphql<{
        myCategories: { name: string }[];
      }>(
        `
          query {
            myCategories {
              name
            }
          }
        `,
        owner,
      );

      expect(body.errors).toBeUndefined();
      expect(body.data?.myCategories).toEqual([]);
    });
  });
});
