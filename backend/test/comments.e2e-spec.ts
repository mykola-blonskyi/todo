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

const HUB_MEMBERS = [
  {
    hubUserId: 'collaborator-1',
    email: 'collaborator@example.com',
    name: 'Collaborator',
  },
];

describe('Comments (GraphQL)', () => {
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

  async function createTask(
    headers: Record<string, string>,
    listId: string,
    title: string,
  ) {
    const body = await graphql<{ createTask: { id: string } }>(
      `mutation { createTask(listId: "${listId}", title: "${title}") { id } }`,
      headers,
    );
    return body.data!.createTask.id;
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

  async function getOwnerAndList() {
    const owner = asUser('owner-1', 'owner@example.com');
    const listId = await createList(owner, 'Groceries');
    return { owner, listId };
  }

  describe('addComment', () => {
    it('rejects when neither taskId nor listId is given', async () => {
      const owner = asUser('owner-1', 'owner@example.com');

      const body = await graphql<{ addComment: { id: string } }>(
        `
          mutation {
            addComment(body: "Hello") {
              id
            }
          }
        `,
        owner,
      );

      expect(body.data).toBeNull();
      expect(body.errors?.[0]).toBeDefined();
    });

    it('rejects when both taskId and listId are given', async () => {
      const { owner, listId } = await getOwnerAndList();
      const taskId = await createTask(owner, listId, 'Milk');

      const body = await graphql<{ addComment: { id: string } }>(
        `mutation { addComment(taskId: "${taskId}", listId: "${listId}", body: "Hello") { id } }`,
        owner,
      );

      expect(body.data).toBeNull();
      expect(body.errors?.[0]).toBeDefined();
    });

    it('rejects an empty or blank comment body', async () => {
      const { owner, listId } = await getOwnerAndList();

      const body = await graphql<{ addComment: { id: string } }>(
        `mutation { addComment(listId: "${listId}", body: "   ") { id } }`,
        owner,
      );

      expect(body.data).toBeNull();
      expect(body.errors?.[0]).toBeDefined();
    });

    it('lets the owner comment on a List', async () => {
      const { owner, listId } = await getOwnerAndList();

      const body = await graphql<{
        addComment: { body: string; author: { email: string } };
      }>(
        `mutation { addComment(listId: "${listId}", body: "Nice list") { body author { email } } }`,
        owner,
      );

      expect(body.errors).toBeUndefined();
      expect(body.data?.addComment).toEqual({
        body: 'Nice list',
        author: { email: 'owner@example.com' },
      });
    });

    it('lets the owner comment on a Task', async () => {
      const { owner, listId } = await getOwnerAndList();
      const taskId = await createTask(owner, listId, 'Milk');

      const body = await graphql<{
        addComment: { body: string; author: { email: string } };
      }>(
        `mutation { addComment(taskId: "${taskId}", body: "Get 2%") { body author { email } } }`,
        owner,
      );

      expect(body.errors).toBeUndefined();
      expect(body.data?.addComment).toEqual({
        body: 'Get 2%',
        author: { email: 'owner@example.com' },
      });
    });

    it('lets an accepted collaborator comment on the List and its Tasks', async () => {
      const { owner, listId } = await getOwnerAndList();
      const taskId = await createTask(owner, listId, 'Milk');
      const collaborator = asUser('collaborator-1', 'collaborator@example.com');
      await inviteAndAccept(owner, listId, collaborator);

      const listComment = await graphql<{ addComment: { id: string } }>(
        `mutation { addComment(listId: "${listId}", body: "From collaborator") { id } }`,
        collaborator,
      );
      expect(listComment.errors).toBeUndefined();

      const taskComment = await graphql<{ addComment: { id: string } }>(
        `mutation { addComment(taskId: "${taskId}", body: "From collaborator too") { id } }`,
        collaborator,
      );
      expect(taskComment.errors).toBeUndefined();
    });

    it('denies commenting for a user with no access to the List/Task', async () => {
      const { owner, listId } = await getOwnerAndList();
      const taskId = await createTask(owner, listId, 'Milk');
      const stranger = asUser('stranger-1', 'stranger@example.com');

      const listComment = await graphql<{ addComment: { id: string } }>(
        `mutation { addComment(listId: "${listId}", body: "Hi") { id } }`,
        stranger,
      );
      expect(listComment.data).toBeNull();
      expect(listComment.errors?.[0]).toBeDefined();

      const taskComment = await graphql<{ addComment: { id: string } }>(
        `mutation { addComment(taskId: "${taskId}", body: "Hi") { id } }`,
        stranger,
      );
      expect(taskComment.data).toBeNull();
      expect(taskComment.errors?.[0]).toBeDefined();
    });

    it('denies commenting for a user with only a pending or declined share', async () => {
      const { owner, listId } = await getOwnerAndList();
      const collaborator = asUser('collaborator-1', 'collaborator@example.com');

      await graphql(
        `mutation {inviteToList(listId: "${listId}", candidate: {
          hubUserId: "${collaborator['x-user-id']}",
          email: "${collaborator['x-user-email']}",
          name: "Collaborator",
          image: null
        }) {id}}`,
        owner,
      );

      const body = await graphql<{ addComment: { id: string } }>(
        `mutation { addComment(listId: "${listId}", body: "Hi") { id } }`,
        collaborator,
      );
      expect(body.data).toBeNull();
      expect(body.errors?.[0]).toBeDefined();
    });

    it("a Collaborator's comment never unlocks Task/List edit operations", async () => {
      const { owner, listId } = await getOwnerAndList();
      const taskId = await createTask(owner, listId, 'Milk');
      const collaborator = asUser('collaborator-1', 'collaborator@example.com');
      await inviteAndAccept(owner, listId, collaborator);

      await graphql(
        `mutation { addComment(taskId: "${taskId}", body: "Comment") { id } }`,
        collaborator,
      );

      const updateBody = await graphql<{ updateTask: { title: string } }>(
        `mutation { updateTask(id: "${taskId}", title: "Hijacked") { title } }`,
        collaborator,
      );
      expect(updateBody.data).toBeNull();
      expect(updateBody.errors?.[0]).toBeDefined();

      const deleteBody = await graphql<{ deleteList: boolean }>(
        `mutation { deleteList(id: "${listId}") }`,
        collaborator,
      );
      expect(deleteBody.data).toBeNull();
      expect(deleteBody.errors?.[0]).toBeDefined();
    });
  });

  describe('reading comments', () => {
    it('returns Task comments in chronological order as part of the Task query response', async () => {
      const { owner, listId } = await getOwnerAndList();
      const taskId = await createTask(owner, listId, 'Milk');

      await graphql(
        `mutation { addComment(taskId: "${taskId}", body: "First") { id } }`,
        owner,
      );
      await graphql(
        `mutation { addComment(taskId: "${taskId}", body: "Second") { id } }`,
        owner,
      );

      const body = await graphql<{
        list: {
          tasks: { comments: { body: string; author: { email: string } }[] }[];
        };
      }>(
        `query { list(id: "${listId}") { tasks { comments { body author { email } } } } }`,
        owner,
      );

      expect(body.errors).toBeUndefined();
      expect(body.data?.list.tasks[0].comments).toEqual([
        { body: 'First', author: { email: 'owner@example.com' } },
        { body: 'Second', author: { email: 'owner@example.com' } },
      ]);
    });

    it('returns List comments in chronological order as part of the List query response', async () => {
      const { owner, listId } = await getOwnerAndList();

      await graphql(
        `mutation { addComment(listId: "${listId}", body: "First") { id } }`,
        owner,
      );
      await graphql(
        `mutation { addComment(listId: "${listId}", body: "Second") { id } }`,
        owner,
      );

      const body = await graphql<{
        list: { comments: { body: string }[] };
      }>(`query { list(id: "${listId}") { comments { body } } }`, owner);

      expect(body.errors).toBeUndefined();
      expect(body.data?.list.comments.map((c) => c.body)).toEqual([
        'First',
        'Second',
      ]);
    });

    it('does not mix Task-level and List-level comments', async () => {
      const { owner, listId } = await getOwnerAndList();
      const taskId = await createTask(owner, listId, 'Milk');

      await graphql(
        `mutation { addComment(listId: "${listId}", body: "List comment") { id } }`,
        owner,
      );
      await graphql(
        `mutation { addComment(taskId: "${taskId}", body: "Task comment") { id } }`,
        owner,
      );

      const body = await graphql<{
        list: {
          comments: { body: string }[];
          tasks: { comments: { body: string }[] }[];
        };
      }>(
        `query { list(id: "${listId}") { comments { body } tasks { comments { body } } } }`,
        owner,
      );

      expect(body.errors).toBeUndefined();
      expect(body.data?.list.comments.map((c) => c.body)).toEqual([
        'List comment',
      ]);
      expect(body.data?.list.tasks[0].comments.map((c) => c.body)).toEqual([
        'Task comment',
      ]);
    });
  });
});
