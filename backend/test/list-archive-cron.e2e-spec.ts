import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { ListsService } from '../src/lists/lists.service';
import { testDb } from './setup/db';

interface GraphQLResponse<T> {
  data: T | null;
  errors?: { extensions: { code: string } }[];
}

// NOW is well past STALE, which is itself outside Rule 28's 30-day window;
// FRESH is inside it.
const STALE = new Date('2026-01-01T00:00:00.000Z');
const NEWER = new Date('2026-01-15T00:00:00.000Z');
const FRESH = new Date('2026-06-20T00:00:00.000Z');
const NOW = new Date('2026-07-01T00:00:00.000Z');

describe('Stale template List auto-archive (Rule 28)', () => {
  let app: INestApplication<App>;
  let listsService: ListsService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    listsService = app.get(ListsService);
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

  const owner = asUser('hub-owner', 'owner@example.com');

  // Goes through the resolver so the User shadow row exists, then rewrites the
  // provenance/timestamp fields Prisma won't let a client set on create.
  async function seedList(options: {
    title: string;
    templateId?: string | null;
    createdAt?: Date;
    doneTasks?: number;
    undoneTasks?: number;
    unarchivedAt?: Date;
    archivedAt?: Date;
  }) {
    const body = await graphql<{ createList: { id: string } }>(
      `mutation { createList(title: "${options.title}") { id } }`,
      owner,
    );
    const id = body.data!.createList.id;

    await testDb.list.update({
      where: { id },
      data: {
        templateId: options.templateId ?? null,
        createdAt: options.createdAt ?? STALE,
        unarchivedAt: options.unarchivedAt ?? null,
        archivedAt: options.archivedAt ?? null,
      },
    });

    for (let i = 0; i < (options.doneTasks ?? 0); i++) {
      await testDb.task.create({
        data: { listId: id, title: `done-${i}`, done: true },
      });
    }
    for (let i = 0; i < (options.undoneTasks ?? 0); i++) {
      await testDb.task.create({
        data: { listId: id, title: `open-${i}`, done: false },
      });
    }

    return id;
  }

  async function seedTemplate(title: string) {
    const body = await graphql<{ createListTemplate: { id: string } }>(
      `mutation { createListTemplate(title: "${title}", taskTitles: ["Vacuum"], recurrenceType: daily, timezone: "UTC") { id } }`,
      owner,
    );
    return body.data!.createListTemplate.id;
  }

  async function archivedAt(id: string) {
    const list = await testDb.list.findUniqueOrThrow({ where: { id } });
    return list.archivedAt;
  }

  it('registers a scheduled cron job for archiving stale template Lists', () => {
    const registry = app.get(SchedulerRegistry);
    expect(registry.getCronJob('archive-stale-template-lists')).toBeDefined();
  });

  it('archives a finished, stale, non-newest Occurrence', async () => {
    const templateId = await seedTemplate('Weekly clean');
    const stale = await seedList({
      title: 'Week 1',
      templateId,
      createdAt: STALE,
      doneTasks: 2,
    });
    await seedList({
      title: 'Week 2',
      templateId,
      createdAt: NEWER,
      doneTasks: 1,
    });

    expect(await listsService.archiveStaleTemplateLists(NOW)).toEqual([stale]);
    expect(await archivedAt(stale)).toEqual(NOW);
  });

  it('archives an Occurrence with no Tasks at all', async () => {
    const templateId = await seedTemplate('Empty weekly');
    const stale = await seedList({
      title: 'Empty week 1',
      templateId,
      createdAt: STALE,
    });
    await seedList({ title: 'Empty week 2', templateId, createdAt: NEWER });

    expect(await listsService.archiveStaleTemplateLists(NOW)).toEqual([stale]);
  });

  it('never archives a manually-created List, however old and finished', async () => {
    const manual = await seedList({
      title: 'Manual',
      templateId: null,
      createdAt: STALE,
      doneTasks: 1,
    });

    expect(await listsService.archiveStaleTemplateLists(NOW)).toEqual([]);
    expect(await archivedAt(manual)).toBeNull();
  });

  it('never archives an Occurrence younger than the 30-day window', async () => {
    const templateId = await seedTemplate('Recent weekly');
    const fresh = await seedList({
      title: 'Fresh week',
      templateId,
      createdAt: FRESH,
      doneTasks: 1,
    });
    await seedList({ title: 'Newest week', templateId, createdAt: NOW });

    expect(await listsService.archiveStaleTemplateLists(NOW)).toEqual([]);
    expect(await archivedAt(fresh)).toBeNull();
  });

  it('never archives an Occurrence with an undone Task', async () => {
    const templateId = await seedTemplate('Unfinished weekly');
    const unfinished = await seedList({
      title: 'Week 1',
      templateId,
      createdAt: STALE,
      doneTasks: 1,
      undoneTasks: 1,
    });
    await seedList({ title: 'Week 2', templateId, createdAt: NEWER });

    expect(await listsService.archiveStaleTemplateLists(NOW)).toEqual([]);
    expect(await archivedAt(unfinished)).toBeNull();
  });

  it('keeps the newest Occurrence live even when it is itself stale', async () => {
    const templateId = await seedTemplate('Dormant weekly');
    const older = await seedList({
      title: 'Week 1',
      templateId,
      createdAt: STALE,
      doneTasks: 1,
    });
    const newest = await seedList({
      title: 'Week 2',
      templateId,
      createdAt: NEWER,
      doneTasks: 1,
    });

    expect(await listsService.archiveStaleTemplateLists(NOW)).toEqual([older]);
    expect(await archivedAt(newest)).toBeNull();
  });

  it('sweeps once and then leaves the template alone', async () => {
    const templateId = await seedTemplate('Long dormant weekly');
    const older = await seedList({
      title: 'Week 1',
      templateId,
      createdAt: STALE,
      doneTasks: 1,
    });
    const newest = await seedList({
      title: 'Week 2',
      templateId,
      createdAt: NEWER,
      doneTasks: 1,
    });

    expect(await listsService.archiveStaleTemplateLists(NOW)).toEqual([older]);
    expect(await listsService.archiveStaleTemplateLists(NOW)).toEqual([]);
    expect(await archivedAt(newest)).toBeNull();
  });

  it('counts an already-archived sibling as the newest Occurrence', async () => {
    // Reachable when the List that was newest got deleted after a sweep. The
    // two candidate rules disagree here and nowhere else: comparing against
    // live Lists only would make `older` the newest and exempt it, while
    // Rule 28 compares against every List whatever its archive state.
    const templateId = await seedTemplate('Half-archived weekly');
    const older = await seedList({
      title: 'Week 1',
      templateId,
      createdAt: STALE,
      doneTasks: 1,
    });
    await seedList({
      title: 'Week 2',
      templateId,
      createdAt: NEWER,
      doneTasks: 1,
      archivedAt: NEWER,
    });

    expect(await listsService.archiveStaleTemplateLists(NOW)).toEqual([older]);
  });

  it('leaves a List that is not archived untouched when it is restored', async () => {
    // unarchiveList would otherwise pin any owned List, archived or not.
    const templateId = await seedTemplate('Never archived weekly');
    const live = await seedList({
      title: 'Week 1',
      templateId,
      createdAt: STALE,
      doneTasks: 1,
    });
    const ownerRow = await testDb.user.findUniqueOrThrow({
      where: { identitySub: 'hub-owner' },
    });

    await listsService.unarchiveList(ownerRow.id, live);

    const row = await testDb.list.findUniqueOrThrow({ where: { id: live } });
    expect(row.unarchivedAt).toBeNull();
  });

  it('never re-archives a List the owner restored', async () => {
    const templateId = await seedTemplate('Restored weekly');
    const restored = await seedList({
      title: 'Week 1',
      templateId,
      createdAt: STALE,
      doneTasks: 1,
      unarchivedAt: new Date('2026-02-01T00:00:00.000Z'),
    });
    await seedList({ title: 'Week 2', templateId, createdAt: NEWER });

    expect(await listsService.archiveStaleTemplateLists(NOW)).toEqual([]);
    expect(await archivedAt(restored)).toBeNull();
  });

  it('unarchiveList clears archivedAt and pins the List against the next run', async () => {
    const templateId = await seedTemplate('Weekly clean');
    const stale = await seedList({
      title: 'Week 1',
      templateId,
      createdAt: STALE,
      doneTasks: 1,
    });
    await seedList({ title: 'Week 2', templateId, createdAt: NEWER });
    await listsService.archiveStaleTemplateLists(NOW);

    const body = await graphql<{
      unarchiveList: { id: string; archivedAt: string | null };
    }>(`mutation { unarchiveList(id: "${stale}") { id archivedAt } }`, owner);

    expect(body.data!.unarchiveList.archivedAt).toBeNull();
    const list = await testDb.list.findUniqueOrThrow({ where: { id: stale } });
    expect(list.unarchivedAt).not.toBeNull();
    expect(await listsService.archiveStaleTemplateLists(NOW)).toEqual([]);
  });

  it('rejects unarchiveList from a Collaborator - only the owner restores', async () => {
    const collaborator = asUser('hub-other', 'other@example.com');
    const templateId = await seedTemplate('Shared weekly');
    const stale = await seedList({
      title: 'Week 1',
      templateId,
      createdAt: STALE,
      doneTasks: 1,
    });
    await seedList({ title: 'Week 2', templateId, createdAt: NEWER });
    await listsService.archiveStaleTemplateLists(NOW);
    // Accepted straight into the DB - inviting goes through the hub's
    // member search, which this spec has no business exercising.
    const other = await testDb.user.create({
      data: { identitySub: 'hub-other', email: 'other@example.com' },
    });
    await testDb.listShare.create({
      data: {
        listId: stale,
        userId: other.id,
        status: 'accepted',
        respondedAt: NOW,
      },
    });

    const body = await graphql(
      `mutation { unarchiveList(id: "${stale}") { id } }`,
      collaborator,
    );

    expect(body.errors?.[0]).toBeDefined();
    expect(await archivedAt(stale)).toEqual(NOW);
  });

  it('leaves CalendarSync rows (and therefore Google Calendar events) untouched', async () => {
    const templateId = await seedTemplate('Synced weekly');
    const stale = await seedList({
      title: 'Week 1',
      templateId,
      createdAt: STALE,
      doneTasks: 1,
    });
    await seedList({ title: 'Week 2', templateId, createdAt: NEWER });
    const user = await testDb.user.findUniqueOrThrow({
      where: { identitySub: 'hub-owner' },
    });
    await testDb.calendarSync.create({
      data: {
        listId: stale,
        userId: user.id,
        googleEventId: 'event-1',
        googleCalendarId: 'primary',
      },
    });

    await listsService.archiveStaleTemplateLists(NOW);

    const syncs = await testDb.calendarSync.findMany({
      where: { listId: stale },
    });
    expect(syncs).toHaveLength(1);
    expect(syncs[0].googleEventId).toBe('event-1');
    const tasks = await testDb.task.findMany({ where: { listId: stale } });
    expect(tasks).toHaveLength(1);
  });

  it('still returns archived Lists from myLists, flagged', async () => {
    const templateId = await seedTemplate('Weekly clean');
    const stale = await seedList({
      title: 'Week 1',
      templateId,
      createdAt: STALE,
      doneTasks: 1,
    });
    await seedList({ title: 'Week 2', templateId, createdAt: NEWER });
    await listsService.archiveStaleTemplateLists(NOW);

    const body = await graphql<{
      myLists: { id: string; archivedAt: string | null }[];
    }>(
      `
        query {
          myLists {
            id
            archivedAt
          }
        }
      `,
      owner,
    );

    const returned = body.data!.myLists;
    expect(returned).toHaveLength(2);
    expect(
      returned.find((list) => list.id === stale)!.archivedAt,
    ).not.toBeNull();
  });
});
