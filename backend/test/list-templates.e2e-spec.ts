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

describe('ListTemplate (GraphQL)', () => {
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
    return {
      'x-user-id': hubUserId,
      'x-user-email': email,
      // A real browser always sends this on every request - only
      // searchTemplateCandidates actually reads it (see HubSessionCookie,
      // TODO-54), but every caller in this file gets one so the helper
      // matches a real request shape.
      cookie: `authjs.session-token=${hubUserId}-session`,
    };
  }

  async function graphql<T>(query: string, headers: Record<string, string>) {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set(headers)
      .send({ query });
    return res.body as GraphQLResponse<T>;
  }

  async function createListTemplate(
    headers: Record<string, string>,
    title: string,
  ) {
    const body = await graphql<{ createListTemplate: { id: string } }>(
      `mutation { createListTemplate(title: "${title}", taskTitles: ["Vacuum", "Dishes"], recurrenceType: weekly, weekDays: [1, 3, 5], timezone: "Europe/Kyiv") { id } }`,
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

  it('creates a ListTemplate with the given fields', async () => {
    const owner = asUser('hub-1', 'owner@example.com');

    const body = await graphql<{
      createListTemplate: {
        title: string;
        taskTitles: string[];
        recurrenceType: string;
        weekDays: number[];
        status: string;
        timezone: string;
      };
    }>(
      `
        mutation {
          createListTemplate(
            title: "Weekly Cleaning"
            taskTitles: ["Vacuum", "Dishes"]
            recurrenceType: weekly
            weekDays: [1, 3, 5]
            timezone: "Europe/Kyiv"
          ) {
            title
            taskTitles
            recurrenceType
            weekDays
            status
            timezone
          }
        }
      `,
      owner,
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.createListTemplate).toEqual({
      title: 'Weekly Cleaning',
      taskTitles: ['Vacuum', 'Dishes'],
      recurrenceType: 'weekly',
      weekDays: [1, 3, 5],
      status: 'active',
      timezone: 'Europe/Kyiv',
    });
  });

  it('rejects an empty or blank title', async () => {
    const owner = asUser('hub-1', 'owner@example.com');

    const body = await graphql<{ createListTemplate: unknown }>(
      `
        mutation {
          createListTemplate(
            title: "   "
            taskTitles: []
            recurrenceType: daily
            timezone: "UTC"
          ) {
            id
          }
        }
      `,
      owner,
    );

    expect(body.data).toBeNull();
    expect(body.errors?.[0]).toBeDefined();
  });

  it("myListTemplates returns only the caller's own templates", async () => {
    const owner = asUser('hub-1', 'owner@example.com');
    const other = asUser('hub-2', 'other@example.com');
    await createListTemplate(owner, 'Mine');
    await createListTemplate(other, 'Theirs');

    const body = await graphql<{ myListTemplates: { title: string }[] }>(
      `
        query {
          myListTemplates {
            title
          }
        }
      `,
      owner,
    );

    expect(body.data?.myListTemplates).toEqual([{ title: 'Mine' }]);
  });

  it('listTemplate returns a single template for its owner', async () => {
    const owner = asUser('hub-1', 'owner@example.com');
    const id = await createListTemplate(owner, 'Weekly Cleaning');

    const body = await graphql<{ listTemplate: { id: string; title: string } }>(
      `query { listTemplate(id: "${id}") { id title } }`,
      owner,
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.listTemplate).toEqual({ id, title: 'Weekly Cleaning' });
  });

  it('denies listTemplate for a non-owner', async () => {
    const owner = asUser('hub-1', 'owner@example.com');
    const other = asUser('hub-2', 'other@example.com');
    const id = await createListTemplate(owner, 'Weekly Cleaning');

    const body = await graphql<{ listTemplate: unknown }>(
      `query { listTemplate(id: "${id}") { id } }`,
      other,
    );

    expect(body.data).toBeNull();
    expect(body.errors?.[0]).toBeDefined();
  });

  it('updates only the provided fields, leaving the rest untouched', async () => {
    const owner = asUser('hub-1', 'owner@example.com');
    const id = await createListTemplate(owner, 'Weekly Cleaning');

    const body = await graphql<{
      updateListTemplate: { title: string; taskTitles: string[] };
    }>(
      `mutation { updateListTemplate(id: "${id}", title: "Weekly Deep Clean") { title taskTitles } }`,
      owner,
    );

    expect(body.data?.updateListTemplate).toEqual({
      title: 'Weekly Deep Clean',
      taskTitles: ['Vacuum', 'Dishes'],
    });
  });

  it('denies updateListTemplate for a non-owner', async () => {
    const owner = asUser('hub-1', 'owner@example.com');
    const id = await createListTemplate(owner, 'Weekly Cleaning');

    const body = await graphql<{ updateListTemplate: unknown }>(
      `mutation { updateListTemplate(id: "${id}", title: "Hijacked") { title } }`,
      asUser('hub-2', 'other@example.com'),
    );

    expect(body.data).toBeNull();
    expect(body.errors?.[0]).toBeDefined();
  });

  describe('defaultCategoryId', () => {
    it('sets a default category on create', async () => {
      const owner = asUser('hub-1', 'owner@example.com');
      const categoryId = await createCategory(owner, 'Home');

      const body = await graphql<{
        createListTemplate: { defaultCategoryId: string | null };
      }>(
        `mutation { createListTemplate(title: "Weekly Cleaning", taskTitles: [], recurrenceType: daily, timezone: "UTC", defaultCategoryId: "${categoryId}") { defaultCategoryId } }`,
        owner,
      );

      expect(body.errors).toBeUndefined();
      expect(body.data?.createListTemplate.defaultCategoryId).toBe(categoryId);
    });

    it('sets and clears a default category via updateListTemplate', async () => {
      const owner = asUser('hub-1', 'owner@example.com');
      const categoryId = await createCategory(owner, 'Home');
      const id = await createListTemplate(owner, 'Weekly Cleaning');

      const setBody = await graphql<{
        updateListTemplate: { defaultCategoryId: string | null };
      }>(
        `mutation { updateListTemplate(id: "${id}", defaultCategoryId: "${categoryId}") { defaultCategoryId } }`,
        owner,
      );
      expect(setBody.errors).toBeUndefined();
      expect(setBody.data?.updateListTemplate.defaultCategoryId).toBe(
        categoryId,
      );

      const clearBody = await graphql<{
        updateListTemplate: { defaultCategoryId: string | null };
      }>(
        `mutation { updateListTemplate(id: "${id}", defaultCategoryId: null) { defaultCategoryId } }`,
        owner,
      );
      expect(clearBody.errors).toBeUndefined();
      expect(clearBody.data?.updateListTemplate.defaultCategoryId).toBeNull();
    });

    it("rejects a defaultCategoryId that isn't owned by the caller, on create", async () => {
      const owner = asUser('hub-1', 'owner@example.com');
      const other = asUser('hub-2', 'other@example.com');
      const otherCategoryId = await createCategory(other, 'Their Category');

      const body = await graphql<{ createListTemplate: unknown }>(
        `mutation { createListTemplate(title: "Weekly Cleaning", taskTitles: [], recurrenceType: daily, timezone: "UTC", defaultCategoryId: "${otherCategoryId}") { id } }`,
        owner,
      );

      expect(body.data).toBeNull();
      expect(body.errors?.[0]).toBeDefined();
    });

    it("rejects a defaultCategoryId that isn't owned by the caller, on update", async () => {
      const owner = asUser('hub-1', 'owner@example.com');
      const other = asUser('hub-2', 'other@example.com');
      const id = await createListTemplate(owner, 'Weekly Cleaning');
      const otherCategoryId = await createCategory(other, 'Their Category');

      const body = await graphql<{ updateListTemplate: unknown }>(
        `mutation { updateListTemplate(id: "${id}", defaultCategoryId: "${otherCategoryId}") { id } }`,
        owner,
      );

      expect(body.data).toBeNull();
      expect(body.errors?.[0]).toBeDefined();
    });

    it('is cleared, not blocked, when the referenced Category is later deleted', async () => {
      const owner = asUser('hub-1', 'owner@example.com');
      const categoryId = await createCategory(owner, 'Home');
      const id = await createListTemplate(owner, 'Weekly Cleaning');
      await graphql(
        `mutation { updateListTemplate(id: "${id}", defaultCategoryId: "${categoryId}") { id } }`,
        owner,
      );

      const deleteBody = await graphql<{ deleteCategory: boolean }>(
        `mutation { deleteCategory(id: "${categoryId}") }`,
        owner,
      );
      expect(deleteBody.errors).toBeUndefined();

      const template = await testDb.listTemplate.findUniqueOrThrow({
        where: { id },
      });
      expect(template.defaultCategoryId).toBeNull();
    });
  });

  it('pauses and resumes a ListTemplate for its owner', async () => {
    const owner = asUser('hub-1', 'owner@example.com');
    const id = await createListTemplate(owner, 'Weekly Cleaning');

    const paused = await graphql<{ pauseListTemplate: { status: string } }>(
      `mutation { pauseListTemplate(id: "${id}") { status } }`,
      owner,
    );
    expect(paused.data?.pauseListTemplate.status).toBe('paused');

    const resumed = await graphql<{ resumeListTemplate: { status: string } }>(
      `mutation { resumeListTemplate(id: "${id}") { status } }`,
      owner,
    );
    expect(resumed.data?.resumeListTemplate.status).toBe('active');
  });

  it('denies pauseListTemplate and resumeListTemplate for a non-owner', async () => {
    const owner = asUser('hub-1', 'owner@example.com');
    const id = await createListTemplate(owner, 'Weekly Cleaning');
    const other = asUser('hub-2', 'other@example.com');

    const pauseBody = await graphql<{ pauseListTemplate: unknown }>(
      `mutation { pauseListTemplate(id: "${id}") { status } }`,
      other,
    );
    expect(pauseBody.data).toBeNull();
    expect(pauseBody.errors?.[0]).toBeDefined();

    const resumeBody = await graphql<{ resumeListTemplate: unknown }>(
      `mutation { resumeListTemplate(id: "${id}") { status } }`,
      other,
    );
    expect(resumeBody.data).toBeNull();
    expect(resumeBody.errors?.[0]).toBeDefined();
  });

  it('deletes a ListTemplate for its owner', async () => {
    const owner = asUser('hub-1', 'owner@example.com');
    const id = await createListTemplate(owner, 'Weekly Cleaning');

    const deleteBody = await graphql<{ deleteListTemplate: boolean }>(
      `mutation { deleteListTemplate(id: "${id}") }`,
      owner,
    );
    expect(deleteBody.data?.deleteListTemplate).toBe(true);

    const listBody = await graphql<{ myListTemplates: unknown[] }>(
      `
        query {
          myListTemplates {
            id
          }
        }
      `,
      owner,
    );
    expect(listBody.data?.myListTemplates).toEqual([]);
  });

  it('denies deleteListTemplate for a non-owner', async () => {
    const owner = asUser('hub-1', 'owner@example.com');
    const id = await createListTemplate(owner, 'Weekly Cleaning');

    const body = await graphql<{ deleteListTemplate: unknown }>(
      `mutation { deleteListTemplate(id: "${id}") }`,
      asUser('hub-2', 'other@example.com'),
    );

    expect(body.data).toBeNull();
    expect(body.errors?.[0]).toBeDefined();
  });

  it('deleting a ListTemplate clears templateId on Lists it spawned, rather than cascading', async () => {
    const owner = asUser('hub-1', 'owner@example.com');
    const id = await createListTemplate(owner, 'Weekly Cleaning');

    // No spawning logic exists yet (that's a later ticket) - simulate a
    // spawned List directly to exercise the onDelete: SetNull FK from #39.
    const ownerRecord = await testDb.user.findUniqueOrThrow({
      where: { identitySub: 'hub-1' },
    });
    const spawnedList = await testDb.list.create({
      data: {
        title: 'Spawned occurrence',
        ownerId: ownerRecord.id,
        templateId: id,
      },
    });

    const deleteBody = await graphql<{ deleteListTemplate: boolean }>(
      `mutation { deleteListTemplate(id: "${id}") }`,
      owner,
    );
    expect(deleteBody.data?.deleteListTemplate).toBe(true);

    const survivedList = await testDb.list.findUniqueOrThrow({
      where: { id: spawnedList.id },
    });
    expect(survivedList.templateId).toBeNull();
  });

  it('adds and removes a default TemplateCollaborator for the owner', async () => {
    const owner = asUser('hub-1', 'owner@example.com');
    const id = await createListTemplate(owner, 'Weekly Cleaning');

    const addBody = await graphql<{
      addTemplateCollaborator: { id: string; name: string };
    }>(
      `mutation { addTemplateCollaborator(templateId: "${id}", candidate: { hubUserId: "hub-2", email: "collab@example.com", name: "Collab", image: null }) { id name } }`,
      owner,
    );
    expect(addBody.data?.addTemplateCollaborator.name).toBe('Collab');
    const collaboratorId = addBody.data!.addTemplateCollaborator.id;

    const listedBody = await graphql<{
      myListTemplates: { collaborators: { id: string }[] }[];
    }>(
      `
        query {
          myListTemplates {
            collaborators {
              id
            }
          }
        }
      `,
      owner,
    );
    expect(listedBody.data?.myListTemplates[0].collaborators).toEqual([
      { id: collaboratorId },
    ]);

    const removeBody = await graphql<{ removeTemplateCollaborator: boolean }>(
      `mutation { removeTemplateCollaborator(templateId: "${id}", targetUserId: "${collaboratorId}") }`,
      owner,
    );
    expect(removeBody.data?.removeTemplateCollaborator).toBe(true);

    const afterRemove = await graphql<{
      myListTemplates: { collaborators: unknown[] }[];
    }>(
      `
        query {
          myListTemplates {
            collaborators {
              id
            }
          }
        }
      `,
      owner,
    );
    expect(afterRemove.data?.myListTemplates[0].collaborators).toEqual([]);
  });

  it("does not overwrite an existing user's real profile with a spoofed candidate", async () => {
    // Plant the victim's real profile the normal way - any authenticated
    // request upserts the caller's own shadow row via findOrCreateByIdentity.
    const victim = asUser('victim-1', 'victim@example.com');
    await createListTemplate(victim, 'Victims own template');

    const owner = asUser('hub-1', 'owner@example.com');
    const id = await createListTemplate(owner, 'Weekly Cleaning');

    const body = await graphql<{ addTemplateCollaborator: { id: string } }>(
      `mutation { addTemplateCollaborator(templateId: "${id}", candidate: { hubUserId: "victim-1", email: "attacker-controlled@evil.example.com", name: "Spoofed Name", image: null }) { id } }`,
      owner,
    );
    expect(body.errors).toBeUndefined();

    const victimRow = await testDb.user.findUniqueOrThrow({
      where: { identitySub: 'victim-1' },
    });
    expect(victimRow.email).toBe('victim@example.com');
    expect(victimRow.name).toBeNull();
  });

  it('adding the same collaborator twice does not error (idempotent)', async () => {
    const owner = asUser('hub-1', 'owner@example.com');
    const id = await createListTemplate(owner, 'Weekly Cleaning');
    const candidate = `{ hubUserId: "hub-2", email: "collab@example.com", name: "Collab", image: null }`;

    await graphql(
      `mutation { addTemplateCollaborator(templateId: "${id}", candidate: ${candidate}) { id } }`,
      owner,
    );
    const secondAdd = await graphql<{
      addTemplateCollaborator: { id: string };
    }>(
      `mutation { addTemplateCollaborator(templateId: "${id}", candidate: ${candidate}) { id } }`,
      owner,
    );

    expect(secondAdd.errors).toBeUndefined();

    const listedBody = await graphql<{
      myListTemplates: { collaborators: unknown[] }[];
    }>(
      `
        query {
          myListTemplates {
            collaborators {
              id
            }
          }
        }
      `,
      owner,
    );
    expect(listedBody.data?.myListTemplates[0].collaborators).toHaveLength(1);
  });

  it('denies addTemplateCollaborator and removeTemplateCollaborator for a non-owner', async () => {
    const owner = asUser('hub-1', 'owner@example.com');
    const id = await createListTemplate(owner, 'Weekly Cleaning');
    const other = asUser('hub-2', 'other@example.com');

    const addBody = await graphql<{ addTemplateCollaborator: unknown }>(
      `mutation { addTemplateCollaborator(templateId: "${id}", candidate: { hubUserId: "hub-3", email: "x@example.com", name: null, image: null }) { id } }`,
      other,
    );
    expect(addBody.data).toBeNull();
    expect(addBody.errors?.[0]).toBeDefined();

    const removeBody = await graphql<{ removeTemplateCollaborator: unknown }>(
      `mutation { removeTemplateCollaborator(templateId: "${id}", targetUserId: "does-not-matter") }`,
      other,
    );
    expect(removeBody.data).toBeNull();
    expect(removeBody.errors?.[0]).toBeDefined();
  });

  it('denies removing a collaborator who was never added', async () => {
    const owner = asUser('hub-1', 'owner@example.com');
    const id = await createListTemplate(owner, 'Weekly Cleaning');

    const body = await graphql<{ removeTemplateCollaborator: unknown }>(
      `mutation { removeTemplateCollaborator(templateId: "${id}", targetUserId: "00000000-0000-0000-0000-000000000000") }`,
      owner,
    );

    expect(body.data).toBeNull();
    expect(body.errors?.[0]).toBeDefined();
  });

  describe('searching for template candidates (searchTemplateCandidates)', () => {
    // The hub's own wire shape (ADR-009) - userId, not hubUserId. Mapped to
    // our hubUserId naming inside HubClientService (TODO-54).
    const hubWirePayload = [
      {
        userId: 'hub-user-1',
        email: 'a@example.com',
        name: 'A',
        image: null,
      },
    ];
    const expectedCandidates = [
      {
        hubUserId: 'hub-user-1',
        email: 'a@example.com',
        name: 'A',
        image: null,
      },
    ];

    beforeEach(() => {
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(new Response(JSON.stringify(hubWirePayload)));
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('returns the candidates the hub returns', async () => {
      const owner = asUser('hub-1', 'owner@example.com');
      const id = await createListTemplate(owner, 'Weekly Cleaning');

      const body = await graphql<{ searchTemplateCandidates: unknown[] }>(
        `query {searchTemplateCandidates(templateId: "${id}", q: "a") {hubUserId email name image}}`,
        owner,
      );

      expect(body.errors).toBeUndefined();
      expect(body.data!.searchTemplateCandidates).toEqual(expectedCandidates);
    });

    it('denies searchTemplateCandidates for a non-owner', async () => {
      const owner = asUser('hub-1', 'owner@example.com');
      const other = asUser('hub-2', 'other@example.com');
      const id = await createListTemplate(owner, 'Weekly Cleaning');

      const body = await graphql<{ searchTemplateCandidates: unknown[] }>(
        `query {searchTemplateCandidates(templateId: "${id}", q: "a") {hubUserId email name image}}`,
        other,
      );

      expect(body.data).toBeNull();
      expect(body.errors?.[0]).toBeDefined();
    });

    it("forwards the caller's own session cookie to the hub (TODO-54)", async () => {
      const fetchSpy = jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(new Response(JSON.stringify(hubWirePayload)));

      const owner = asUser('hub-1', 'owner@example.com');
      const id = await createListTemplate(owner, 'Weekly Cleaning');

      await graphql<{ searchTemplateCandidates: unknown[] }>(
        `query {searchTemplateCandidates(templateId: "${id}", q: "a") {hubUserId email name image}}`,
        owner,
      );

      const calledInit = fetchSpy.mock.calls[0][1] as { headers: HeadersInit };

      expect(calledInit.headers).toEqual({ cookie: owner.cookie });
    });

    it('rejects searchTemplateCandidates without a session cookie, never calling the hub', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch');

      const owner = asUser('hub-1', 'owner@example.com');
      const id = await createListTemplate(owner, 'Weekly Cleaning');
      const ownerWithoutCookie = {
        'x-user-id': 'hub-1',
        'x-user-email': 'owner@example.com',
      };

      const body = await graphql<{ searchTemplateCandidates: unknown[] }>(
        `query {searchTemplateCandidates(templateId: "${id}", q: "a") {hubUserId email name image}}`,
        ownerWithoutCookie,
      );

      expect(body.data).toBeNull();
      expect(body.errors?.[0]).toBeDefined();
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });
});
