import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { testDb } from './setup/db';
import { stubHubProjectMembers } from './setup/hub';

interface GraphQLResponse<T> {
  data: T | null;
  errors?: { extensions: { code: string } }[];
}

const HUB_MEMBERS = [
  { hubUserId: 'hub-2', email: 'collab@example.com', name: 'Collab' },
];

describe('Occurrence spawning (GraphQL)', () => {
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

  interface CreateTemplateArgs {
    title?: string;
    taskTitles?: string[];
    recurrenceType: 'daily' | 'weekly' | 'monthly' | 'everyNDays';
    weekDays?: number[];
    dayOfMonth?: number;
    intervalDays?: number;
    streakDays?: number;
    streakStartDate?: string;
    timezone?: string;
    defaultCategoryId?: string;
  }

  async function createListTemplate(
    headers: Record<string, string>,
    args: CreateTemplateArgs,
  ) {
    const taskTitles = args.taskTitles ?? ['Vacuum', 'Dishes'];
    const parts = [
      `title: "${args.title ?? 'Weekly Cleaning'}"`,
      `taskTitles: [${taskTitles.map((t) => `"${t}"`).join(', ')}]`,
      `recurrenceType: ${args.recurrenceType}`,
      `timezone: "${args.timezone ?? 'UTC'}"`,
    ];
    if (args.weekDays) parts.push(`weekDays: [${args.weekDays.join(', ')}]`);
    if (args.dayOfMonth !== undefined)
      parts.push(`dayOfMonth: ${args.dayOfMonth}`);
    if (args.intervalDays !== undefined)
      parts.push(`intervalDays: ${args.intervalDays}`);
    if (args.streakDays !== undefined)
      parts.push(`streakDays: ${args.streakDays}`);
    if (args.streakStartDate !== undefined)
      parts.push(`streakStartDate: "${args.streakStartDate}"`);
    if (args.defaultCategoryId !== undefined)
      parts.push(`defaultCategoryId: "${args.defaultCategoryId}"`);

    const body = await graphql<{ createListTemplate: { id: string } }>(
      `mutation { createListTemplate(${parts.join(', ')}) { id } }`,
      headers,
    );
    return body.data!.createListTemplate.id;
  }

  async function createCategory(headers: Record<string, string>, name: string) {
    const body = await graphql<{ createCategory: { id: string } }>(
      `mutation { createCategory(name: "${name}") { id } }`,
      headers,
    );
    return body.data!.createCategory.id;
  }

  async function spawn(
    headers: Record<string, string>,
    templateId: string,
    now: string,
  ) {
    return graphql<{
      spawnDueOccurrence: {
        id: string;
        templateId: string | null;
        tasks: { title: string; done: boolean; dueDate: string | null }[];
      } | null;
    }>(
      `mutation { spawnDueOccurrence(templateId: "${templateId}", now: "${now}") { id templateId tasks { title done dueDate } } }`,
      headers,
    );
  }

  describe('daily', () => {
    it('is due every day and never spawns twice on the same day', async () => {
      const owner = asUser('hub-1', 'owner@example.com');
      const id = await createListTemplate(owner, { recurrenceType: 'daily' });

      const first = await spawn(owner, id, '2026-03-10T09:00:00.000Z');
      expect(first.errors).toBeUndefined();
      expect(first.data?.spawnDueOccurrence).not.toBeNull();

      const secondSameDay = await spawn(owner, id, '2026-03-10T20:00:00.000Z');
      expect(secondSameDay.data?.spawnDueOccurrence).toBeNull();

      const nextDay = await spawn(owner, id, '2026-03-11T09:00:00.000Z');
      expect(nextDay.data?.spawnDueOccurrence).not.toBeNull();
    });
  });

  describe('weekly', () => {
    it('fires only on the configured weekdays', async () => {
      const owner = asUser('hub-1', 'owner@example.com');
      // 2026-03-10 is a Tuesday (weekday 2).
      const id = await createListTemplate(owner, {
        recurrenceType: 'weekly',
        weekDays: [2],
      });

      const wrongDay = await spawn(owner, id, '2026-03-09T09:00:00.000Z');
      expect(wrongDay.data?.spawnDueOccurrence).toBeNull();

      const rightDay = await spawn(owner, id, '2026-03-10T09:00:00.000Z');
      expect(rightDay.data?.spawnDueOccurrence).not.toBeNull();
    });
  });

  describe('monthly', () => {
    it('fires on the configured day of month', async () => {
      const owner = asUser('hub-1', 'owner@example.com');
      const id = await createListTemplate(owner, {
        recurrenceType: 'monthly',
        dayOfMonth: 15,
      });

      const wrongDay = await spawn(owner, id, '2026-03-10T09:00:00.000Z');
      expect(wrongDay.data?.spawnDueOccurrence).toBeNull();

      const rightDay = await spawn(owner, id, '2026-03-15T09:00:00.000Z');
      expect(rightDay.data?.spawnDueOccurrence).not.toBeNull();
    });

    it('clamps a dayOfMonth beyond the month length to the last day, without skipping or rolling over', async () => {
      const owner = asUser('hub-1', 'owner@example.com');
      const id = await createListTemplate(owner, {
        recurrenceType: 'monthly',
        dayOfMonth: 31,
      });

      // April has 30 days - the 30th should fire, the 1st of May should not
      // (it must not roll over into the next month).
      const notYet = await spawn(owner, id, '2026-04-29T09:00:00.000Z');
      expect(notYet.data?.spawnDueOccurrence).toBeNull();

      const clampedDay = await spawn(owner, id, '2026-04-30T09:00:00.000Z');
      expect(clampedDay.data?.spawnDueOccurrence).not.toBeNull();

      const nextMonthFirst = await spawn(owner, id, '2026-05-01T09:00:00.000Z');
      expect(nextMonthFirst.data?.spawnDueOccurrence).toBeNull();
    });
  });

  describe('everyNDays', () => {
    it('with streakDays=1 (default), fires on the anchor day then not again until the rest period elapses', async () => {
      const owner = asUser('hub-1', 'owner@example.com');
      // Rule 25: intervalDays is rest-days-only. streakDays defaults to 1,
      // so cycle length = 1 + 3 = 4 days: due on day 0, then not again
      // until day 4.
      const id = await createListTemplate(owner, {
        recurrenceType: 'everyNDays',
        intervalDays: 3,
        streakStartDate: '2026-03-10',
      });

      const firstEver = await spawn(owner, id, '2026-03-10T09:00:00.000Z');
      expect(firstEver.data?.spawnDueOccurrence).not.toBeNull();

      const tooSoon = await spawn(owner, id, '2026-03-12T09:00:00.000Z');
      expect(tooSoon.data?.spawnDueOccurrence).toBeNull();

      const stillTooSoon = await spawn(owner, id, '2026-03-13T09:00:00.000Z');
      expect(stillTooSoon.data?.spawnDueOccurrence).toBeNull();

      const nextCycle = await spawn(owner, id, '2026-03-14T09:00:00.000Z');
      expect(nextCycle.data?.spawnDueOccurrence).not.toBeNull();
    });

    it('fires nothing before the streakStartDate', async () => {
      const owner = asUser('hub-1', 'owner@example.com');
      const id = await createListTemplate(owner, {
        recurrenceType: 'everyNDays',
        intervalDays: 3,
        streakStartDate: '2026-03-10',
      });

      const beforeAnchor = await spawn(owner, id, '2026-03-09T09:00:00.000Z');
      expect(beforeAnchor.data?.spawnDueOccurrence).toBeNull();
    });

    it('with a multi-day streakDays, fires on each ON day and stays silent on each rest day across a full cycle', async () => {
      const owner = asUser('hub-1', 'owner@example.com');
      // 2 days on, 2 days off, starting 2026-03-10 (Tue): Tue+Wed ON,
      // Thu+Fri OFF, Sat+Sun ON again.
      const id = await createListTemplate(owner, {
        recurrenceType: 'everyNDays',
        streakDays: 2,
        intervalDays: 2,
        streakStartDate: '2026-03-10',
      });

      const day0 = await spawn(owner, id, '2026-03-10T09:00:00.000Z'); // Tue - ON
      expect(day0.data?.spawnDueOccurrence).not.toBeNull();

      const day1 = await spawn(owner, id, '2026-03-11T09:00:00.000Z'); // Wed - ON
      expect(day1.data?.spawnDueOccurrence).not.toBeNull();

      const day2 = await spawn(owner, id, '2026-03-12T09:00:00.000Z'); // Thu - OFF
      expect(day2.data?.spawnDueOccurrence).toBeNull();

      const day3 = await spawn(owner, id, '2026-03-13T09:00:00.000Z'); // Fri - OFF
      expect(day3.data?.spawnDueOccurrence).toBeNull();

      const day4 = await spawn(owner, id, '2026-03-14T09:00:00.000Z'); // Sat - ON (next cycle)
      expect(day4.data?.spawnDueOccurrence).not.toBeNull();

      const day5 = await spawn(owner, id, '2026-03-15T09:00:00.000Z'); // Sun - ON
      expect(day5.data?.spawnDueOccurrence).not.toBeNull();
    });

    it('never spawns twice on the same calendar day, even mid-streak', async () => {
      const owner = asUser('hub-1', 'owner@example.com');
      const id = await createListTemplate(owner, {
        recurrenceType: 'everyNDays',
        streakDays: 2,
        intervalDays: 2,
        streakStartDate: '2026-03-10',
      });

      const morning = await spawn(owner, id, '2026-03-11T09:00:00.000Z');
      expect(morning.data?.spawnDueOccurrence).not.toBeNull();

      const evening = await spawn(owner, id, '2026-03-11T20:00:00.000Z');
      expect(evening.data?.spawnDueOccurrence).toBeNull();
    });

    it('does not self-heal a skipped calendar day - a missed ON day is never caught up later', async () => {
      const owner = asUser('hub-1', 'owner@example.com');
      // streakDays=1, intervalDays=2 -> cycle 3: ON day 0, OFF days 1-2,
      // ON day 3. Skip straight past day 3 (never call spawn for it) to
      // simulate a missed cron run, then check day 4 - which should be OFF
      // (day 4 % 3 = 1), proving day 3's ON-ness wasn't carried forward.
      const id = await createListTemplate(owner, {
        recurrenceType: 'everyNDays',
        intervalDays: 2,
        streakStartDate: '2026-03-10',
      });

      const day0 = await spawn(owner, id, '2026-03-10T09:00:00.000Z');
      expect(day0.data?.spawnDueOccurrence).not.toBeNull();

      // Day 3 (2026-03-13) is skipped entirely - never called.

      const day4 = await spawn(owner, id, '2026-03-14T09:00:00.000Z');
      expect(day4.data?.spawnDueOccurrence).toBeNull();
    });
  });

  describe('timezone anchoring', () => {
    it('evaluates the weekday in the template timezone, not UTC', async () => {
      const owner = asUser('hub-1', 'owner@example.com');
      // 2026-01-05T23:30:00Z is a Monday (weekday 1) in UTC, but already
      // Tuesday (weekday 2) 13:30 local in Pacific/Kiritimati (UTC+14).
      const id = await createListTemplate(owner, {
        recurrenceType: 'weekly',
        weekDays: [2],
        timezone: 'Pacific/Kiritimati',
      });

      const body = await spawn(owner, id, '2026-01-05T23:30:00.000Z');
      expect(body.data?.spawnDueOccurrence).not.toBeNull();
    });
  });

  describe('spawned List contents', () => {
    it('creates exactly one List with fresh, undone Tasks matching current taskTitles', async () => {
      const owner = asUser('hub-1', 'owner@example.com');
      const id = await createListTemplate(owner, {
        recurrenceType: 'daily',
        taskTitles: ['Vacuum', 'Dishes', 'Laundry'],
      });

      const body = await spawn(owner, id, '2026-03-10T09:00:00.000Z');
      const spawned = body.data!.spawnDueOccurrence!;

      expect(spawned.tasks).toHaveLength(3);
      expect(spawned.tasks.map((t) => t.title)).toEqual([
        'Vacuum',
        'Dishes',
        'Laundry',
      ]);
      expect(spawned.tasks.every((t) => t.done === false)).toBe(true);
      expect(spawned.tasks.every((t) => t.dueDate === null)).toBe(true);
      expect(spawned.templateId).toBe(id);
    });

    it('does not carry over unfinished Tasks from a previous Occurrence', async () => {
      const owner = asUser('hub-1', 'owner@example.com');
      const id = await createListTemplate(owner, { recurrenceType: 'daily' });

      const first = await spawn(owner, id, '2026-03-10T09:00:00.000Z');
      const firstListId = first.data!.spawnDueOccurrence!.id;

      // Leave the first Occurrence's Tasks undone, then spawn the next one.
      const second = await spawn(owner, id, '2026-03-11T09:00:00.000Z');
      const secondSpawned = second.data!.spawnDueOccurrence!;

      expect(secondSpawned.id).not.toBe(firstListId);
      expect(secondSpawned.tasks.map((t) => t.title)).toEqual([
        'Vacuum',
        'Dishes',
      ]);
    });

    it('gives every TemplateCollaborator an accepted ListShare on the spawned List', async () => {
      const owner = asUser('hub-1', 'owner@example.com');
      const id = await createListTemplate(owner, { recurrenceType: 'daily' });

      const addCollaborator = await graphql<{
        addTemplateCollaborator: { id: string };
      }>(
        `mutation { addTemplateCollaborator(templateId: "${id}", candidate: { hubUserId: "hub-2", email: "collab@example.com", name: "Collab" }) { id } }`,
        owner,
      );
      expect(addCollaborator.errors).toBeUndefined();

      const body = await spawn(owner, id, '2026-03-10T09:00:00.000Z');
      const spawned = body.data!.spawnDueOccurrence!;

      const listShare = await testDb.listShare.findFirst({
        where: { listId: spawned.id },
        include: { user: true },
      });
      expect(listShare?.user.identitySub).toBe('hub-2');
      expect(listShare?.status).toBe('accepted');
      expect(listShare?.respondedAt).not.toBeNull();
    });

    it('auto-categorizes the spawned List for the owner when defaultCategoryId is set', async () => {
      const owner = asUser('hub-1', 'owner@example.com');
      const categoryId = await createCategory(owner, 'Home');
      const id = await createListTemplate(owner, {
        recurrenceType: 'daily',
        defaultCategoryId: categoryId,
      });

      const body = await spawn(owner, id, '2026-03-10T09:00:00.000Z');
      const spawned = body.data!.spawnDueOccurrence!;

      const ownerUser = await testDb.user.findUniqueOrThrow({
        where: { identitySub: 'hub-1' },
      });
      const assignment = await testDb.listCategoryAssignment.findUnique({
        where: {
          userId_listId: { userId: ownerUser.id, listId: spawned.id },
        },
      });
      expect(assignment?.categoryId).toBe(categoryId);
    });

    it('does not categorize the spawned List when defaultCategoryId is unset', async () => {
      const owner = asUser('hub-1', 'owner@example.com');
      const id = await createListTemplate(owner, { recurrenceType: 'daily' });

      const body = await spawn(owner, id, '2026-03-10T09:00:00.000Z');
      const spawned = body.data!.spawnDueOccurrence!;

      const assignments = await testDb.listCategoryAssignment.findMany({
        where: { listId: spawned.id },
      });
      expect(assignments).toHaveLength(0);
    });

    it('never auto-categorizes for TemplateCollaborators, only the owner', async () => {
      const owner = asUser('hub-1', 'owner@example.com');
      const categoryId = await createCategory(owner, 'Home');
      const id = await createListTemplate(owner, {
        recurrenceType: 'daily',
        defaultCategoryId: categoryId,
      });

      await graphql(
        `mutation { addTemplateCollaborator(templateId: "${id}", candidate: { hubUserId: "hub-2", email: "collab@example.com", name: "Collab" }) { id } }`,
        owner,
      );

      const body = await spawn(owner, id, '2026-03-10T09:00:00.000Z');
      const spawned = body.data!.spawnDueOccurrence!;

      const collaboratorUser = await testDb.user.findUniqueOrThrow({
        where: { identitySub: 'hub-2' },
      });
      const collaboratorAssignment =
        await testDb.listCategoryAssignment.findUnique({
          where: {
            userId_listId: {
              userId: collaboratorUser.id,
              listId: spawned.id,
            },
          },
        });
      expect(collaboratorAssignment).toBeNull();
    });
  });

  describe('paused templates', () => {
    it('never spawns while status is paused', async () => {
      const owner = asUser('hub-1', 'owner@example.com');
      const id = await createListTemplate(owner, { recurrenceType: 'daily' });

      await graphql(
        `mutation { pauseListTemplate(id: "${id}") { id } }`,
        owner,
      );

      const body = await spawn(owner, id, '2026-03-10T09:00:00.000Z');
      expect(body.data?.spawnDueOccurrence).toBeNull();
    });
  });

  it('denies spawning for a non-owner', async () => {
    const owner = asUser('hub-1', 'owner@example.com');
    const stranger = asUser('hub-2', 'stranger@example.com');
    const id = await createListTemplate(owner, { recurrenceType: 'daily' });

    const body = await spawn(stranger, id, '2026-03-10T09:00:00.000Z');
    expect(body.data?.spawnDueOccurrence).toBeNull();
    expect(body.errors).toBeDefined();
  });
});
