import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

interface GraphQLResponse<T> {
  data: T | null;
  errors?: { extensions: { code: string } }[];
}

describe('Task (GraphQL)', () => {
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

  async function threeTasks() {
    const owner = asUser('hub-1', 'owner@example.com');
    const listId = await createList(owner, 'Groceries');
    const milkId = await createTask(owner, listId, 'Milk');
    const eggsId = await createTask(owner, listId, 'Eggs');
    const breadId = await createTask(owner, listId, 'Bread');

    return { owner, listId, milkId, eggsId, breadId };
  }

  it('creates a Task on an owned List', async () => {
    const owner = asUser('hub-1', 'owner@example.com');
    const listId = await createList(owner, 'Groceries');

    const body = await graphql<{
      createTask: { title: string; done: boolean; position: number };
    }>(
      `mutation { createTask(listId: "${listId}", title: "Milk") { title done position } }`,
      owner,
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.createTask).toEqual({
      title: 'Milk',
      done: false,
      position: 0,
    });
  });

  it('rejects an empty or blank Task title', async () => {
    const owner = asUser('hub-1', 'owner@example.com');
    const listId = await createList(owner, 'Groceries');

    const body = await graphql<{ createTask: unknown }>(
      `mutation { createTask(listId: "${listId}", title: "   ") { id } }`,
      owner,
    );

    expect(body.data).toBeNull();
    expect(body.errors?.[0]).toBeDefined();
  });

  it('denies createTask on a List owned by another user', async () => {
    const owner = asUser('hub-1', 'owner@example.com');
    const listId = await createList(owner, 'Groceries');

    const body = await graphql<{ createTask: unknown }>(
      `mutation { createTask(listId: "${listId}", title: "Milk") { id } }`,
      asUser('hub-2', 'other@example.com'),
    );

    expect(body.data).toBeNull();
    expect(body.errors?.[0]).toBeDefined();
  });

  it('assigns increasing position to successive Tasks', async () => {
    const owner = asUser('hub-1', 'owner@example.com');
    const listId = await createList(owner, 'Groceries');
    await createTask(owner, listId, 'Milk');
    await createTask(owner, listId, 'Bread');

    const body = await graphql<{
      list: { tasks: { title: string; position: number }[] };
    }>(`query { list(id: "${listId}") { tasks { title position } } }`, owner);

    expect(body.data?.list.tasks).toEqual([
      { title: 'Milk', position: 0 },
      { title: 'Bread', position: 1 },
    ]);
  });

  it('list(id) returns its Tasks', async () => {
    const owner = asUser('hub-1', 'owner@example.com');
    const listId = await createList(owner, 'Groceries');
    await createTask(owner, listId, 'Milk');

    const body = await graphql<{
      list: { tasks: { title: string; done: boolean }[] };
    }>(`query { list(id: "${listId}") { tasks { title done } } }`, owner);

    expect(body.data?.list.tasks).toEqual([{ title: 'Milk', done: false }]);
  });

  it('toggles a Task done for its owner', async () => {
    const owner = asUser('hub-1', 'owner@example.com');
    const listId = await createList(owner, 'Groceries');
    const taskId = await createTask(owner, listId, 'Milk');

    const firstToggle = await graphql<{ toggleTaskDone: { done: boolean } }>(
      `mutation { toggleTaskDone(id: "${taskId}") { done } }`,
      owner,
    );
    expect(firstToggle.data?.toggleTaskDone.done).toBe(true);

    const secondToggle = await graphql<{ toggleTaskDone: { done: boolean } }>(
      `mutation { toggleTaskDone(id: "${taskId}") { done } }`,
      owner,
    );
    expect(secondToggle.data?.toggleTaskDone.done).toBe(false);
  });

  it('denies toggleTaskDone for a non-owner', async () => {
    const owner = asUser('hub-1', 'owner@example.com');
    const listId = await createList(owner, 'Groceries');
    const taskId = await createTask(owner, listId, 'Milk');

    const body = await graphql<{ toggleTaskDone: unknown }>(
      `mutation { toggleTaskDone(id: "${taskId}") { done } }`,
      asUser('hub-2', 'other@example.com'),
    );

    expect(body.data).toBeNull();
    expect(body.errors?.[0]).toBeDefined();
  });

  it('cascades: deleting a List removes all its Tasks', async () => {
    const owner = asUser('hub-1', 'owner@example.com');
    const listId = await createList(owner, 'Groceries');
    const taskId = await createTask(owner, listId, 'Milk');

    const deleteBody = await graphql<{ deleteList: boolean }>(
      `mutation { deleteList(id: "${listId}") }`,
      owner,
    );
    expect(deleteBody.data?.deleteList).toBe(true);

    const toggleBody = await graphql<{ toggleTaskDone: unknown }>(
      `mutation { toggleTaskDone(id: "${taskId}") { done } }`,
      owner,
    );
    expect(toggleBody.data).toBeNull();
    expect(toggleBody.errors?.[0]).toBeDefined();
  });

  it('updates a Task title for its owner', async () => {
    const owner = asUser('hub-1', 'owner@example.com');
    const listId = await createList(owner, 'Groceries');
    const taskId = await createTask(owner, listId, 'Milk');

    const body = await graphql<{ updateTask: { title: string } }>(
      `mutation { updateTask(id: "${taskId}", title: "Oat milk") { title } }`,
      owner,
    );

    expect(body.data?.updateTask.title).toBe('Oat milk');
  });

  it('updates a Task dueDate for its owner, leaving title untouched', async () => {
    const owner = asUser('hub-1', 'owner@example.com');
    const listId = await createList(owner, 'Groceries');
    const taskId = await createTask(owner, listId, 'Milk');

    const body = await graphql<{
      updateTask: { title: string; dueDate: string };
    }>(
      `mutation { updateTask(id: "${taskId}", dueDate: "2026-08-01T00:00:00.000Z") { title dueDate } }`,
      owner,
    );

    expect(body.data?.updateTask.title).toBe('Milk');
    expect(body.data?.updateTask.dueDate).toBe('2026-08-01T00:00:00.000Z');
  });

  it('rejects updating a Task to an empty or blank title', async () => {
    const owner = asUser('hub-1', 'owner@example.com');
    const listId = await createList(owner, 'Groceries');
    const taskId = await createTask(owner, listId, 'Milk');

    const body = await graphql<{ updateTask: unknown }>(
      `mutation { updateTask(id: "${taskId}", title: "   ") { title } }`,
      owner,
    );

    expect(body.data).toBeNull();
    expect(body.errors?.[0]).toBeDefined();
  });

  it('denies updateTask for a non-owner', async () => {
    const owner = asUser('hub-1', 'owner@example.com');
    const listId = await createList(owner, 'Groceries');
    const taskId = await createTask(owner, listId, 'Milk');

    const body = await graphql<{ updateTask: unknown }>(
      `mutation { updateTask(id: "${taskId}", title: "Hijacked") { title } }`,
      asUser('hub-2', 'other@example.com'),
    );

    expect(body.data).toBeNull();
    expect(body.errors?.[0]).toBeDefined();
  });

  it('deletes a Task for its owner', async () => {
    const owner = asUser('hub-1', 'owner@example.com');
    const listId = await createList(owner, 'Groceries');
    const taskId = await createTask(owner, listId, 'Milk');

    const deleteBody = await graphql<{ deleteTask: boolean }>(
      `mutation { deleteTask(id: "${taskId}") }`,
      owner,
    );
    expect(deleteBody.data?.deleteTask).toBe(true);

    const listBody = await graphql<{ list: { tasks: unknown[] } }>(
      `query { list(id: "${listId}") { tasks { id } } }`,
      owner,
    );
    expect(listBody.data?.list.tasks).toEqual([]);
  });

  it('denies deleteTask for a non-owner', async () => {
    const owner = asUser('hub-1', 'owner@example.com');
    const listId = await createList(owner, 'Groceries');
    const taskId = await createTask(owner, listId, 'Milk');

    const body = await graphql<{ deleteTask: unknown }>(
      `mutation { deleteTask(id: "${taskId}") }`,
      asUser('hub-2', 'other@example.com'),
    );

    expect(body.data).toBeNull();
    expect(body.errors?.[0]).toBeDefined();
  });

  it('moves a Task up and down within its List', async () => {
    const { owner, milkId, eggsId, breadId } = await threeTasks();

    const down = await graphql<{ moveTask: { id: string }[] }>(
      `mutation { moveTask(id: "${milkId}", direction: down) { id } }`,
      owner,
    );
    expect(down.data?.moveTask.map((task) => task.id)).toEqual([
      eggsId,
      milkId,
      breadId,
    ]);

    const up = await graphql<{ moveTask: { id: string }[] }>(
      `mutation { moveTask(id: "${milkId}", direction: up) { id } }`,
      owner,
    );
    expect(up.data?.moveTask.map((task) => task.id)).toEqual([
      milkId,
      eggsId,
      breadId,
    ]);
  });

  it.each([
    ['up', 'first'],
    ['down', 'last'],
  ])(
    'leaves the order alone moving %s from the %s position',
    async (direction) => {
      const { owner, milkId, breadId, eggsId } = await threeTasks();
      const id = direction === 'up' ? milkId : breadId;

      const body = await graphql<{ moveTask: { id: string }[] }>(
        `mutation { moveTask(id: "${id}", direction: ${direction}) { id } }`,
        owner,
      );

      expect(body.errors).toBeUndefined();
      expect(body.data?.moveTask.map((task) => task.id)).toEqual([
        milkId,
        eggsId,
        breadId,
      ]);
    },
  );

  it('still moves when a collaborator adds a Task in between', async () => {
    const { owner, listId, milkId, eggsId, breadId } = await threeTasks();
    const addedId = await createTask(owner, listId, 'Jam');

    const body = await graphql<{ moveTask: { id: string }[] }>(
      `mutation { moveTask(id: "${milkId}", direction: down) { id } }`,
      owner,
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.moveTask.map((task) => task.id)).toEqual([
      eggsId,
      milkId,
      breadId,
      addedId,
    ]);
  });

  it('denies moveTask for a non-owner', async () => {
    const { milkId } = await threeTasks();
    const stranger = asUser('hub-2', 'stranger@example.com');

    const body = await graphql<{ moveTask: unknown }>(
      `mutation { moveTask(id: "${milkId}", direction: down) { id } }`,
      stranger,
    );

    expect(body.data).toBeNull();
    expect(body.errors?.[0].extensions.code).toBe('NOT_FOUND');
  });

  it('rejects an explicit null title as a bad request', async () => {
    const owner = asUser('hub-1', 'owner@example.com');
    const listId = await createList(owner, 'Groceries');
    const taskId = await createTask(owner, listId, 'Milk');

    const body = await graphql(
      `mutation {updateTask(id: "${taskId}", title: null) {id title}}`,
      owner,
    );

    expect(body.errors?.[0].extensions.code).toBe('BAD_REQUEST');
  });
});
