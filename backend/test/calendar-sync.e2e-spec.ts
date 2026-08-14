import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { GoogleCalendarApiClient } from '../src/google-calendar/google-calendar-api.client';
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

describe('Calendar sync (GraphQL)', () => {
  let app: INestApplication<App>;
  let upsertEvent: jest.Mock;

  beforeEach(async () => {
    upsertEvent = jest.fn().mockResolvedValue({
      eventId: 'event-1',
      calendarId: 'primary',
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GoogleCalendarApiClient)
      .useValue({ upsertEvent })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.restoreAllMocks();
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

  async function createList(headers: Record<string, string>, title: string) {
    const body = await graphql<{ createList: { id: string } }>(
      `mutation { createList(title: "${title}") { id } }`,
      headers,
    );
    return body.data!.createList.id;
  }

  async function setDueDate(
    headers: Record<string, string>,
    listId: string,
    dueDate: string,
  ) {
    await graphql(
      `mutation { updateListDueDate(id: "${listId}", dueDate: "${dueDate}T00:00:00.000Z") { id } }`,
      headers,
    );
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

  async function connectGoogleCalendar(headers: Record<string, string>) {
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
      headers,
    );
    jest.restoreAllMocks();
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

  it('rejects syncing a List with no due date', async () => {
    const owner = asUser('owner-1', 'owner@example.com');
    const listId = await createList(owner, 'Groceries');
    await connectGoogleCalendar(owner);

    const body = await graphql<{ syncListToCalendar: boolean }>(
      `mutation { syncListToCalendar(listId: "${listId}") }`,
      owner,
    );

    expect(body.data).toBeNull();
    expect(body.errors?.[0]).toBeDefined();
    expect(upsertEvent).not.toHaveBeenCalled();
  });

  it('syncs a List as a single event with a checklist of every Task', async () => {
    const owner = asUser('owner-1', 'owner@example.com');
    const listId = await createList(owner, 'Groceries');
    await setDueDate(owner, listId, '2026-09-01');
    const milkId = await createTask(owner, listId, 'Milk');
    await createTask(owner, listId, 'Eggs');
    await connectGoogleCalendar(owner);

    await graphql(`mutation { toggleTaskDone(id: "${milkId}") { id } }`, owner);

    const body = await graphql<{ syncListToCalendar: boolean }>(
      `mutation { syncListToCalendar(listId: "${listId}") }`,
      owner,
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.syncListToCalendar).toBe(true);
    expect(upsertEvent).toHaveBeenCalledTimes(1);
    expect(upsertEvent).toHaveBeenCalledWith('plain-access-token', {
      eventId: undefined,
      summary: 'Groceries',
      description: '☑ Milk\n☐ Eggs',
      dueDate: '2026-09-01',
    });

    const user = await testDb.user.findUniqueOrThrow({
      where: { hubUserId: 'owner-1' },
    });
    const sync = await testDb.calendarSync.findUniqueOrThrow({
      where: { userId_listId: { userId: user.id, listId } },
    });
    expect(sync).toMatchObject({
      googleEventId: 'event-1',
      googleCalendarId: 'primary',
    });
  });

  it('re-syncing updates the same event instead of creating a duplicate', async () => {
    const owner = asUser('owner-1', 'owner@example.com');
    const listId = await createList(owner, 'Groceries');
    await setDueDate(owner, listId, '2026-09-01');
    await createTask(owner, listId, 'Milk');
    await connectGoogleCalendar(owner);

    await graphql(
      `mutation { syncListToCalendar(listId: "${listId}") }`,
      owner,
    );
    await createTask(owner, listId, 'Eggs');

    const body = await graphql<{ syncListToCalendar: boolean }>(
      `mutation { syncListToCalendar(listId: "${listId}") }`,
      owner,
    );

    expect(body.errors).toBeUndefined();
    expect(upsertEvent).toHaveBeenCalledTimes(2);
    expect(upsertEvent).toHaveBeenLastCalledWith('plain-access-token', {
      eventId: 'event-1',
      summary: 'Groceries',
      description: '☐ Milk\n☐ Eggs',
      dueDate: '2026-09-01',
    });

    const user = await testDb.user.findUniqueOrThrow({
      where: { hubUserId: 'owner-1' },
    });
    const syncs = await testDb.calendarSync.findMany({
      where: { userId: user.id, listId },
    });
    expect(syncs).toHaveLength(1);
  });

  it('marking a Task done has no effect on the CalendarSync row (Rule 9 retired)', async () => {
    const owner = asUser('owner-1', 'owner@example.com');
    const listId = await createList(owner, 'Groceries');
    await setDueDate(owner, listId, '2026-09-01');
    const taskId = await createTask(owner, listId, 'Milk');
    await connectGoogleCalendar(owner);
    await graphql(
      `mutation { syncListToCalendar(listId: "${listId}") }`,
      owner,
    );

    const user = await testDb.user.findUniqueOrThrow({
      where: { hubUserId: 'owner-1' },
    });
    const before = await testDb.calendarSync.findUniqueOrThrow({
      where: { userId_listId: { userId: user.id, listId } },
    });

    await graphql(`mutation { toggleTaskDone(id: "${taskId}") { id } }`, owner);

    const after = await testDb.calendarSync.findUniqueOrThrow({
      where: { userId_listId: { userId: user.id, listId } },
    });
    expect(after).toEqual(before);
    expect(upsertEvent).toHaveBeenCalledTimes(1);
  });

  it('denies syncing for a user with no access to the List', async () => {
    const owner = asUser('owner-1', 'owner@example.com');
    const listId = await createList(owner, 'Groceries');
    await setDueDate(owner, listId, '2026-09-01');
    const stranger = asUser('stranger-1', 'stranger@example.com');
    await connectGoogleCalendar(stranger);

    const body = await graphql<{ syncListToCalendar: boolean }>(
      `mutation { syncListToCalendar(listId: "${listId}") }`,
      stranger,
    );

    expect(body.data).toBeNull();
    expect(body.errors?.[0]).toBeDefined();
    expect(upsertEvent).not.toHaveBeenCalled();
  });

  it('rejects syncing when the caller has not connected Google Calendar', async () => {
    const owner = asUser('owner-1', 'owner@example.com');
    const listId = await createList(owner, 'Groceries');
    await setDueDate(owner, listId, '2026-09-01');

    const body = await graphql<{ syncListToCalendar: boolean }>(
      `mutation { syncListToCalendar(listId: "${listId}") }`,
      owner,
    );

    expect(body.data).toBeNull();
    expect(body.errors?.[0]).toBeDefined();
    expect(upsertEvent).not.toHaveBeenCalled();
  });

  it("an accepted collaborator can sync using their own connection, independently of the owner's", async () => {
    const owner = asUser('owner-1', 'owner@example.com');
    const listId = await createList(owner, 'Groceries');
    await setDueDate(owner, listId, '2026-09-01');
    await createTask(owner, listId, 'Milk');

    const collaborator = asUser('collaborator-1', 'collaborator@example.com');
    await inviteAndAccept(owner, listId, collaborator);
    await connectGoogleCalendar(collaborator);

    const body = await graphql<{ syncListToCalendar: boolean }>(
      `mutation { syncListToCalendar(listId: "${listId}") }`,
      collaborator,
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.syncListToCalendar).toBe(true);

    const ownerUser = await testDb.user.findUniqueOrThrow({
      where: { hubUserId: 'owner-1' },
    });
    const ownerSync = await testDb.calendarSync.findUnique({
      where: { userId_listId: { userId: ownerUser.id, listId } },
    });
    expect(ownerSync).toBeNull();
  });

  it('refreshes an expired access token before syncing', async () => {
    const owner = asUser('owner-1', 'owner@example.com');
    const listId = await createList(owner, 'Groceries');
    await setDueDate(owner, listId, '2026-09-01');
    await createTask(owner, listId, 'Milk');
    await connectGoogleCalendar(owner);

    const user = await testDb.user.findUniqueOrThrow({
      where: { hubUserId: 'owner-1' },
    });
    await testDb.googleCalendarConnection.update({
      where: { userId: user.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    mockTokenExchange({
      access_token: 'refreshed-access-token',
      expires_in: 3600,
      scope: 'https://www.googleapis.com/auth/calendar.events',
    });

    const body = await graphql<{ syncListToCalendar: boolean }>(
      `mutation { syncListToCalendar(listId: "${listId}") }`,
      owner,
    );

    expect(body.errors).toBeUndefined();
    expect(upsertEvent).toHaveBeenCalledWith(
      'refreshed-access-token',
      expect.anything(),
    );
  });
});
