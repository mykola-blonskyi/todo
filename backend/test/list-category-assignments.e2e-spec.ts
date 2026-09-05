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

describe('ListCategoryAssignment + myLists filter (GraphQL)', () => {
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

  async function createList(headers: Record<string, string>, title: string) {
    const body = await graphql<{ createList: { id: string } }>(
      `mutation { createList(title: "${title}") { id } }`,
      headers,
    );
    return body.data!.createList.id;
  }

  async function createCategory(headers: Record<string, string>, name: string) {
    const body = await graphql<{ createCategory: { id: string } }>(
      `mutation { createCategory(name: "${name}") { id } }`,
      headers,
    );
    return body.data!.createCategory.id;
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

  async function inviteAndAccept(
    owner: Record<string, string>,
    listId: string,
    collaborator: Record<string, string>,
  ) {
    const listShare = await graphql<{ inviteToList: { id: string } }>(
      `mutation {inviteToList(listId: "${listId}", candidate: {
        hubUserId: "${collaborator['x-user-id']}",
        email: "${collaborator['x-user-email']}",
        name: "Collaborator",
        image: null
      }) {id}}`,
      owner,
    );
    await graphql(
      `mutation {acceptInvite(shareId: "${listShare.data!.inviteToList.id}") {id}}`,
      collaborator,
    );
  }

  describe('assignListCategory', () => {
    it('assigns a Category to a List for its owner', async () => {
      const owner = asUser('owner-1', 'owner@example.com');
      const listId = await createList(owner, 'Groceries');
      const categoryId = await createCategory(owner, 'Home');

      const body = await assignListCategory(owner, listId, categoryId);

      expect(body.errors).toBeUndefined();
      expect(body.data?.assignListCategory).toBe(true);

      const user = await testDb.user.findUniqueOrThrow({
        where: { identitySub: 'owner-1' },
      });
      const assignment = await testDb.listCategoryAssignment.findUnique({
        where: { userId_listId: { userId: user.id, listId } },
      });
      expect(assignment?.categoryId).toBe(categoryId);
    });

    it('re-assigning replaces the prior category (folder model, not multi-tag)', async () => {
      const owner = asUser('owner-1', 'owner@example.com');
      const listId = await createList(owner, 'Groceries');
      const homeId = await createCategory(owner, 'Home');
      const workId = await createCategory(owner, 'Work');

      await assignListCategory(owner, listId, homeId);
      await assignListCategory(owner, listId, workId);

      const user = await testDb.user.findUniqueOrThrow({
        where: { identitySub: 'owner-1' },
      });
      const assignments = await testDb.listCategoryAssignment.findMany({
        where: { userId: user.id, listId },
      });
      expect(assignments).toHaveLength(1);
      expect(assignments[0].categoryId).toBe(workId);
    });

    it('an accepted collaborator can assign their own category to a shared List', async () => {
      const owner = asUser('owner-1', 'owner@example.com');
      const listId = await createList(owner, 'Groceries');
      const collaborator = asUser('collaborator-1', 'collaborator@example.com');
      await inviteAndAccept(owner, listId, collaborator);
      const categoryId = await createCategory(collaborator, 'Personal');

      const body = await assignListCategory(collaborator, listId, categoryId);

      expect(body.errors).toBeUndefined();
      expect(body.data?.assignListCategory).toBe(true);
    });

    it('denies assigning for a user with no access to the List', async () => {
      const owner = asUser('owner-1', 'owner@example.com');
      const listId = await createList(owner, 'Groceries');
      const stranger = asUser('stranger-1', 'stranger@example.com');
      const categoryId = await createCategory(stranger, 'Home');

      const body = await assignListCategory(stranger, listId, categoryId);

      expect(body.data).toBeNull();
      expect(body.errors?.[0]).toBeDefined();
    });

    it("denies assigning another user's category, even to your own List", async () => {
      const owner = asUser('owner-1', 'owner@example.com');
      const listId = await createList(owner, 'Groceries');
      const otherUser = asUser('other-1', 'other@example.com');
      const otherCategoryId = await createCategory(otherUser, 'Their Category');

      const body = await assignListCategory(owner, listId, otherCategoryId);

      expect(body.data).toBeNull();
      expect(body.errors?.[0]).toBeDefined();
    });
  });

  describe('unassignListCategory', () => {
    it('removes the assignment for the caller', async () => {
      const owner = asUser('owner-1', 'owner@example.com');
      const listId = await createList(owner, 'Groceries');
      const categoryId = await createCategory(owner, 'Home');
      await assignListCategory(owner, listId, categoryId);

      const body = await graphql<{ unassignListCategory: boolean }>(
        `mutation { unassignListCategory(listId: "${listId}") }`,
        owner,
      );

      expect(body.errors).toBeUndefined();
      expect(body.data?.unassignListCategory).toBe(true);

      const user = await testDb.user.findUniqueOrThrow({
        where: { identitySub: 'owner-1' },
      });
      const assignment = await testDb.listCategoryAssignment.findUnique({
        where: { userId_listId: { userId: user.id, listId } },
      });
      expect(assignment).toBeNull();
    });

    it("two collaborators' assignments on the same List are fully independent", async () => {
      const owner = asUser('owner-1', 'owner@example.com');
      const listId = await createList(owner, 'Groceries');
      const collaborator = asUser('collaborator-1', 'collaborator@example.com');
      await inviteAndAccept(owner, listId, collaborator);

      const ownerCategoryId = await createCategory(owner, 'Work');
      const collaboratorCategoryId = await createCategory(
        collaborator,
        'Personal',
      );
      await assignListCategory(owner, listId, ownerCategoryId);
      await assignListCategory(collaborator, listId, collaboratorCategoryId);

      await graphql(
        `mutation { unassignListCategory(listId: "${listId}") }`,
        collaborator,
      );

      const ownerUser = await testDb.user.findUniqueOrThrow({
        where: { identitySub: 'owner-1' },
      });
      const ownerAssignment = await testDb.listCategoryAssignment.findUnique({
        where: { userId_listId: { userId: ownerUser.id, listId } },
      });
      expect(ownerAssignment?.categoryId).toBe(ownerCategoryId);
    });
  });

  describe('deleting a Category cascades to its assignments only', () => {
    it('removes the assignment but leaves the List untouched', async () => {
      const owner = asUser('owner-1', 'owner@example.com');
      const listId = await createList(owner, 'Groceries');
      const categoryId = await createCategory(owner, 'Home');
      await assignListCategory(owner, listId, categoryId);

      await graphql(`mutation { deleteCategory(id: "${categoryId}") }`, owner);

      const list = await testDb.list.findUnique({ where: { id: listId } });
      expect(list).not.toBeNull();

      const assignments = await testDb.listCategoryAssignment.findMany({
        where: { listId },
      });
      expect(assignments).toHaveLength(0);
    });
  });

  describe('myLists(categoryId, uncategorizedOnly)', () => {
    it('categoryId filters to only Lists assigned to that category', async () => {
      const owner = asUser('owner-1', 'owner@example.com');
      const homeId = await createCategory(owner, 'Home');
      await createCategory(owner, 'Work');
      const homeListId = await createList(owner, 'Groceries');
      const otherListId = await createList(owner, 'Project plan');
      await assignListCategory(owner, homeListId, homeId);
      void otherListId;

      const body = await graphql<{ myLists: { id: string }[] }>(
        `query { myLists(categoryId: "${homeId}") { id } }`,
        owner,
      );

      expect(body.errors).toBeUndefined();
      expect(body.data?.myLists.map((l) => l.id)).toEqual([homeListId]);
    });

    it('uncategorizedOnly filters to Lists with no assignment for the caller', async () => {
      const owner = asUser('owner-1', 'owner@example.com');
      const categoryId = await createCategory(owner, 'Home');
      const categorizedListId = await createList(owner, 'Groceries');
      const uncategorizedListId = await createList(owner, 'Project plan');
      await assignListCategory(owner, categorizedListId, categoryId);

      const body = await graphql<{ myLists: { id: string }[] }>(
        `
          query {
            myLists(uncategorizedOnly: true) {
              id
            }
          }
        `,
        owner,
      );

      expect(body.errors).toBeUndefined();
      expect(body.data?.myLists.map((l) => l.id)).toEqual([
        uncategorizedListId,
      ]);
    });

    it('neither argument returns everything', async () => {
      const owner = asUser('owner-1', 'owner@example.com');
      const categoryId = await createCategory(owner, 'Home');
      const listA = await createList(owner, 'Groceries');
      const listB = await createList(owner, 'Project plan');
      await assignListCategory(owner, listA, categoryId);

      const body = await graphql<{ myLists: { id: string }[] }>(
        `
          query {
            myLists {
              id
            }
          }
        `,
        owner,
      );

      expect(body.errors).toBeUndefined();
      expect(body.data?.myLists.map((l) => l.id).sort()).toEqual(
        [listA, listB].sort(),
      );
    });

    it('rejects passing both categoryId and uncategorizedOnly together', async () => {
      const owner = asUser('owner-1', 'owner@example.com');
      const categoryId = await createCategory(owner, 'Home');

      const body = await graphql<{ myLists: unknown }>(
        `query { myLists(categoryId: "${categoryId}", uncategorizedOnly: true) { id } }`,
        owner,
      );

      expect(body.data).toBeNull();
      expect(body.errors?.[0]).toBeDefined();
    });

    it('categorization is per-caller - a shared List can differ between owner and collaborator', async () => {
      const owner = asUser('owner-1', 'owner@example.com');
      const listId = await createList(owner, 'Groceries');
      const collaborator = asUser('collaborator-1', 'collaborator@example.com');
      await inviteAndAccept(owner, listId, collaborator);

      const ownerCategoryId = await createCategory(owner, 'Work');
      await assignListCategory(owner, listId, ownerCategoryId);

      const ownerBody = await graphql<{ myLists: { id: string }[] }>(
        `
          query {
            myLists(uncategorizedOnly: true) {
              id
            }
          }
        `,
        owner,
      );
      const collaboratorBody = await graphql<{ myLists: { id: string }[] }>(
        `
          query {
            myLists(uncategorizedOnly: true) {
              id
            }
          }
        `,
        collaborator,
      );

      expect(ownerBody.data?.myLists.map((l) => l.id)).not.toContain(listId);
      expect(collaboratorBody.data?.myLists.map((l) => l.id)).toContain(listId);
    });
  });

  describe('List.myCategory', () => {
    it("returns the caller's own assigned Category", async () => {
      const owner = asUser('owner-1', 'owner@example.com');
      const listId = await createList(owner, 'Groceries');
      const categoryId = await createCategory(owner, 'Home');
      await assignListCategory(owner, listId, categoryId);

      const body = await graphql<{
        list: { myCategory: { id: string; name: string } | null };
      }>(`query { list(id: "${listId}") { myCategory { id name } } }`, owner);

      expect(body.errors).toBeUndefined();
      expect(body.data?.list.myCategory).toEqual({
        id: categoryId,
        name: 'Home',
      });
    });

    it('returns null when unassigned', async () => {
      const owner = asUser('owner-1', 'owner@example.com');
      const listId = await createList(owner, 'Groceries');

      const body = await graphql<{
        list: { myCategory: { id: string } | null };
      }>(`query { list(id: "${listId}") { myCategory { id } } }`, owner);

      expect(body.errors).toBeUndefined();
      expect(body.data?.list.myCategory).toBeNull();
    });

    it('is independent per caller on a shared List', async () => {
      const owner = asUser('owner-1', 'owner@example.com');
      const listId = await createList(owner, 'Groceries');
      const collaborator = asUser('collaborator-1', 'collaborator@example.com');
      await inviteAndAccept(owner, listId, collaborator);

      const ownerCategoryId = await createCategory(owner, 'Work');
      await assignListCategory(owner, listId, ownerCategoryId);

      const collaboratorBody = await graphql<{
        list: { myCategory: { id: string } | null };
      }>(`query { list(id: "${listId}") { myCategory { id } } }`, collaborator);

      expect(collaboratorBody.data?.list.myCategory).toBeNull();
    });
  });
});
