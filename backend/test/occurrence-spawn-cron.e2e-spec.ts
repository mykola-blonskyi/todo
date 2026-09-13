import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { OccurrencesService } from '../src/occurrences/occurrences.service';
import { testDb } from './setup/db';

interface GraphQLResponse<T> {
  data: T | null;
  errors?: { extensions: { code: string } }[];
}

describe('Occurrence spawn cron wiring', () => {
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

  async function createDailyTemplate(
    headers: Record<string, string>,
    title: string,
  ) {
    const body = await graphql<{ createListTemplate: { id: string } }>(
      `mutation { createListTemplate(title: "${title}", taskTitles: ["Vacuum"], recurrenceType: daily, timezone: "UTC") { id } }`,
      headers,
    );
    return body.data!.createListTemplate.id;
  }

  it('registers a scheduled cron job for spawning occurrences', () => {
    const registry = app.get(SchedulerRegistry);
    expect(registry.getCronJob('spawn-due-occurrences')).toBeDefined();
  });

  it('spawns due Occurrences for every active ListTemplate across owners, skipping paused ones', async () => {
    const ownerA = asUser('hub-1', 'owner-a@example.com');
    const ownerB = asUser('hub-2', 'owner-b@example.com');

    const activeA = await createDailyTemplate(ownerA, 'Owner A daily');
    const activeB = await createDailyTemplate(ownerB, 'Owner B daily');
    const pausedA = await createDailyTemplate(ownerA, 'Owner A paused');
    await graphql(
      `mutation { pauseListTemplate(id: "${pausedA}") { id } }`,
      ownerA,
    );

    const occurrencesService = app.get(OccurrencesService);
    const spawned = await occurrencesService.spawnAllDueOccurrences(
      new Date('2026-03-10T09:00:00.000Z'),
    );

    expect(spawned).toHaveLength(2);
    const templateIds = spawned.map((list) => list.templateId).sort();
    expect(templateIds).toEqual([activeA, activeB].sort());

    const secondRunSameDay = await occurrencesService.spawnAllDueOccurrences(
      new Date('2026-03-10T20:00:00.000Z'),
    );
    expect(secondRunSameDay).toHaveLength(0);
  });

  // Validation stops a bad row being created through the API, so this writes
  // one directly - a row created before that validation existed looks exactly
  // like this, and it used to abort the whole run from wherever findMany
  // happened to order it.
  it('keeps spawning for every other template when one of them throws', async () => {
    const owner = asUser('hub-1', 'owner@example.com');
    const good = await createDailyTemplate(owner, 'Good daily');
    const broken = await createDailyTemplate(owner, 'Broken daily');
    await testDb.listTemplate.update({
      where: { id: broken },
      data: { timezone: 'Mars/Olympus' },
    });

    const spawned = await app
      .get(OccurrencesService)
      .spawnAllDueOccurrences(new Date('2026-03-10T09:00:00.000Z'));

    expect(spawned.map((list) => list.templateId)).toEqual([good]);
  });
});
