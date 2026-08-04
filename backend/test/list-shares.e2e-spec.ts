import { INestApplication, Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import request from 'supertest';
import { ListShareStatus } from '@prisma/client';
import { ShareCandidateInput } from '../src/list-shares/share-candidate.input';
import { testDb } from './setup/db';

interface GraphQLResponse<T> {
  data: T | null;
  errors?: { extensions: { code: string } }[];
}

describe('List Sharing (GraphQL)', () => {
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
      `mutation {createList(title: "${title}") {id}}`,
      headers,
    );

    return body.data!.createList.id;
  }

  async function getOwnerAndList() {
    const owner = asUser('owner-1', 'owner@example.com');
    const listId = await createList(owner, 'Groceries');

    return { owner, listId };
  }

  describe('searching for list share candidates (searchShareCandidates)', () => {
    const hubPayload = [
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
        .mockResolvedValue(new Response(JSON.stringify(hubPayload)));
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('returns the candidates the hub returns', async () => {
      const { owner, listId } = await getOwnerAndList();

      const body = await graphql<{ searchShareCandidates: unknown[] }>(
        `query {searchShareCandidates(listId: "${listId}", q: "a") {hubUserId email name image}}`,
        owner,
      );

      expect(body.errors).toBeUndefined();
      expect(body.data!.searchShareCandidates).toEqual(hubPayload);
    });

    it('resolves to an empty array when the hub finds nothing', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce(new Response(JSON.stringify([])));

      const { owner, listId } = await getOwnerAndList();

      const body = await graphql<{ searchShareCandidates: unknown[] }>(
        `query {searchShareCandidates(listId: "${listId}", q: "a") {hubUserId email name image}}`,
        owner,
      );

      expect(body.errors).toBeUndefined();
      expect(body.data!.searchShareCandidates).toEqual([]);
    });

    it('sends listId and q as query params to the hub', async () => {
      const fetchSpy = jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(new Response(JSON.stringify(hubPayload)));

      const { owner, listId } = await getOwnerAndList();

      await graphql<{ searchShareCandidates: unknown[] }>(
        `query {searchShareCandidates(listId: "${listId}", q: "a") {hubUserId email name image}}`,
        owner,
      );

      const calledUrl = fetchSpy.mock.calls[0][0] as URL;

      expect(calledUrl.searchParams.get('q')).toBe('a');
    });

    it('denies searchShareCandidates for a non-owner', async () => {
      const { listId } = await getOwnerAndList();
      const stranger = asUser('stranger-1', 'stranger@example.com');

      const body = await graphql<{ searchShareCandidates: unknown[] }>(
        `query {searchShareCandidates(listId: "${listId}", q: "a") {hubUserId email name image}}`,
        stranger,
      );

      expect(body.data).toBeNull();
      expect(body.errors?.[0]).toBeDefined();
    });

    it('surfaces an error when the hub returns a malformed response', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(
          new Response(JSON.stringify([{ ...hubPayload[0], hubUserId: null }])),
        );
      jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

      const { owner, listId } = await getOwnerAndList();

      const body = await graphql<{ searchShareCandidates: unknown[] }>(
        `query {searchShareCandidates(listId: "${listId}", q: "a") {hubUserId email name image}}`,
        owner,
      );

      expect(body.data).toBeNull();
      expect(body.errors?.[0]).toBeDefined();
    });
  });

  describe('inviting a collaborator (inviteToList)', () => {
    it('Owner invites a new hub user', async () => {
      const { owner, listId } = await getOwnerAndList();
      const collaborator = {
        hubUserId: 'collaborator-1',
        email: 'collaborator@example.com',
        name: 'A',
        image: null,
      } as ShareCandidateInput;

      const body = await graphql<{
        inviteToList: { id: string; status: ListShareStatus };
      }>(
        `mutation {inviteToList(listId: "${listId}", candidate: {
          hubUserId: "${collaborator.hubUserId}",
          email: "${collaborator.email}",
          name: "${collaborator.name}",
          image: null
        } ) {id status }}`,
        owner,
      );

      expect(body.errors).toBeUndefined();
      expect(body.data!.inviteToList.status).toBe(ListShareStatus.pending);
    });

    it('denies inviteToList for a non-owner', async () => {
      const { listId } = await getOwnerAndList();
      const stranger = asUser('stranger-1', 'stranger@example.com');
      const collaborator = {
        hubUserId: 'collaborator-1',
        email: 'collaborator@example.com',
        name: 'A',
        image: null,
      } as ShareCandidateInput;

      const body = await graphql<{
        inviteToList: { id: string; status: ListShareStatus };
      }>(
        `mutation {inviteToList(listId: "${listId}", candidate: {
          hubUserId: "${collaborator.hubUserId}",
          email: "${collaborator.email}",
          name: "${collaborator.name}",
          image: null
        } ) {id status }}`,
        stranger,
      );

      expect(body.data).toBeNull();
      expect(body.errors?.[0]).toBeDefined();
    });

    it('re-invite same candidate while pending', async () => {
      const { owner, listId } = await getOwnerAndList();
      const collaborator = {
        hubUserId: 'collaborator-1',
        email: 'collaborator@example.com',
        name: 'A',
        image: null,
      } as ShareCandidateInput;

      const invited = await graphql<{
        inviteToList: { id: string; status: ListShareStatus };
      }>(
        `mutation {inviteToList(listId: "${listId}", candidate: {
          hubUserId: "${collaborator.hubUserId}",
          email: "${collaborator.email}",
          name: "${collaborator.name}",
          image: null
        } ) {id status }}`,
        owner,
      );

      expect(invited.errors).toBeUndefined();
      expect(invited.data!.inviteToList.status).toBe(ListShareStatus.pending);

      const body = await graphql<{
        inviteToList: { id: string; status: ListShareStatus };
      }>(
        `mutation {inviteToList(listId: "${listId}", candidate: {
          hubUserId: "${collaborator.hubUserId}",
          email: "${collaborator.email}",
          name: "${collaborator.name}",
          image: null
        } ) {id status }}`,
        owner,
      );

      expect(body.errors).toBeUndefined();
      expect(body.data!.inviteToList.status).toBe(ListShareStatus.pending);
      expect(body.data!.inviteToList.id).toBe(invited.data!.inviteToList.id);
    });

    it('re-invite same candidate while declined', async () => {
      const { owner, listId } = await getOwnerAndList();
      const collaborator = {
        hubUserId: 'collaborator-1',
        email: 'collaborator@example.com',
        name: 'A',
        image: null,
      } as ShareCandidateInput;

      const invited = await graphql<{
        inviteToList: { id: string; status: ListShareStatus };
      }>(
        `mutation {inviteToList(listId: "${listId}", candidate: {
          hubUserId: "${collaborator.hubUserId}",
          email: "${collaborator.email}",
          name: "${collaborator.name}",
          image: null
        } ) {id status }}`,
        owner,
      );

      expect(invited.errors).toBeUndefined();
      expect(invited.data!.inviteToList.status).toBe(ListShareStatus.pending);

      await testDb.listShare.update({
        where: { id: invited.data?.inviteToList.id },
        data: { status: ListShareStatus.declined, respondedAt: new Date() },
      });

      const body = await graphql<{
        inviteToList: {
          id: string;
          status: ListShareStatus;
          respondedAt: string | null;
        };
      }>(
        `mutation {inviteToList(listId: "${listId}", candidate: {
          hubUserId: "${collaborator.hubUserId}",
          email: "${collaborator.email}",
          name: "${collaborator.name}",
          image: null
        } ) {id status respondedAt }}`,
        owner,
      );

      expect(body.errors).toBeUndefined();
      expect(body.data!.inviteToList.status).toBe(ListShareStatus.pending);
      expect(body.data!.inviteToList.id).toBe(invited.data!.inviteToList.id);
      expect(body.data!.inviteToList.respondedAt).toBeNull();

      const listSharesCount = await testDb.listShare.count();

      expect(listSharesCount).toBe(1);
    });

    it('re-invite same candidate while accepted', async () => {
      const { owner, listId } = await getOwnerAndList();
      const collaborator = {
        hubUserId: 'collaborator-1',
        email: 'collaborator@example.com',
        name: 'A',
        image: null,
      } as ShareCandidateInput;

      const invited = await graphql<{
        inviteToList: { id: string; status: ListShareStatus };
      }>(
        `mutation {inviteToList(listId: "${listId}", candidate: {
          hubUserId: "${collaborator.hubUserId}",
          email: "${collaborator.email}",
          name: "${collaborator.name}",
          image: null
        } ) {id status }}`,
        owner,
      );

      expect(invited.errors).toBeUndefined();
      expect(invited.data!.inviteToList.status).toBe(ListShareStatus.pending);

      const acceptedShare = await testDb.listShare.update({
        where: { id: invited.data?.inviteToList.id },
        data: { status: ListShareStatus.accepted, respondedAt: new Date() },
      });

      const body = await graphql<{
        inviteToList: {
          id: string;
          status: ListShareStatus;
          respondedAt: string | null;
        };
      }>(
        `mutation {inviteToList(listId: "${listId}", candidate: {
          hubUserId: "${collaborator.hubUserId}",
          email: "${collaborator.email}",
          name: "${collaborator.name}",
          image: null
        } ) {id status respondedAt }}`,
        owner,
      );

      expect(body.errors).toBeUndefined();
      expect(body.data!.inviteToList.status).toBe(ListShareStatus.accepted);
      expect(body.data!.inviteToList.id).toBe(invited.data!.inviteToList.id);
      expect(body.data!.inviteToList.respondedAt).toBe(
        acceptedShare.respondedAt?.toISOString(),
      );

      const listSharesCount = await testDb.listShare.count();

      expect(listSharesCount).toBe(1);
    });
  });

  describe('responding to invites (pendingInvites / acceptInvite / declineInvite)', () => {
    it("pendingInvites returns the calling user's own pending shares", async () => {
      const { owner, listId } = await getOwnerAndList();
      const collaboratorA = asUser('collaborator-a', 'a@example.com');
      const collaboratorB = asUser('collaborator-b', 'b@example.com');

      await graphql(
        `mutation {inviteToList(listId: "${listId}", candidate: {
          hubUserId: "${collaboratorA['x-user-id']}",
          email: "${collaboratorA['x-user-email']}",
          name: "A",
          image: null
        }) {id status}}`,
        owner,
      );

      await graphql(
        `mutation {inviteToList(listId: "${listId}", candidate: {
        hubUserId: "${collaboratorB['x-user-id']}",
        email: "${collaboratorB['x-user-email']}",
        name: "B",
        image: null
      }) {id status}}`,
        owner,
      );

      const acceptCollaborator = await graphql<{
        pendingInvites: { id: string; status: ListShareStatus }[];
      }>(
        `
          query {
            pendingInvites {
              id
              status
            }
          }
        `,
        collaboratorA,
      );

      expect(acceptCollaborator.errors).toBeUndefined();
      expect(acceptCollaborator.data!.pendingInvites).toHaveLength(1);
      expect(acceptCollaborator.data!.pendingInvites[0].status).toBe(
        ListShareStatus.pending,
      );
    });

    it('denies acceptInvite for the owner', async () => {
      const { owner, listId } = await getOwnerAndList();
      const collaboratorA = asUser('collaborator-a', 'a@example.com');

      const listShare = await graphql<{
        inviteToList: { id: string; status: ListShareStatus };
      }>(
        `mutation {inviteToList(listId: "${listId}", candidate: {
          hubUserId: "${collaboratorA['x-user-id']}",
          email: "${collaboratorA['x-user-email']}",
          name: "A",
          image: null
        }) {id status}}`,
        owner,
      );

      const body = await graphql<{
        acceptInvite: { id: string; status: ListShareStatus };
      }>(
        `
          mutation {
            acceptInvite(shareId: "${listShare.data!.inviteToList.id}") {
              id
              status
            }
          }
        `,
        owner,
      );

      expect(body.data).toBeNull();
      expect(body.errors?.[0]).toBeDefined();
    });

    it('denies acceptInvite for an unrelated user', async () => {
      const { owner, listId } = await getOwnerAndList();
      const collaboratorA = asUser('collaborator-a', 'a@example.com');
      const collaboratorB = asUser('collaborator-b', 'b@example.com');

      const listShare = await graphql<{
        inviteToList: { id: string; status: ListShareStatus };
      }>(
        `mutation {inviteToList(listId: "${listId}", candidate: {
          hubUserId: "${collaboratorA['x-user-id']}",
          email: "${collaboratorA['x-user-email']}",
          name: "A",
          image: null
        }) {id status}}`,
        owner,
      );

      const body = await graphql<{
        acceptInvite: { id: string; status: ListShareStatus };
      }>(
        `
          mutation {
            acceptInvite(shareId: "${listShare.data!.inviteToList.id}") {
              id
              status
            }
          }
        `,
        collaboratorB,
      );

      expect(body.data).toBeNull();
      expect(body.errors?.[0]).toBeDefined();
    });

    it('denies declineInvite for the owner', async () => {
      const { owner, listId } = await getOwnerAndList();
      const collaboratorA = asUser('collaborator-a', 'a@example.com');

      const listShare = await graphql<{
        inviteToList: { id: string; status: ListShareStatus };
      }>(
        `mutation {inviteToList(listId: "${listId}", candidate: {
          hubUserId: "${collaboratorA['x-user-id']}",
          email: "${collaboratorA['x-user-email']}",
          name: "A",
          image: null
        }) {id status}}`,
        owner,
      );

      const body = await graphql<{
        declineInvite: { id: string; status: ListShareStatus };
      }>(
        `
          mutation {
            declineInvite(shareId: "${listShare.data!.inviteToList.id}") {
              id
              status
            }
          }
        `,
        owner,
      );

      expect(body.data).toBeNull();
      expect(body.errors?.[0]).toBeDefined();
    });

    it('denies declineInvite for an unrelated user', async () => {
      const { owner, listId } = await getOwnerAndList();
      const collaboratorA = asUser('collaborator-a', 'a@example.com');
      const collaboratorB = asUser('collaborator-b', 'b@example.com');

      const listShare = await graphql<{
        inviteToList: { id: string; status: ListShareStatus };
      }>(
        `mutation {inviteToList(listId: "${listId}", candidate: {
          hubUserId: "${collaboratorA['x-user-id']}",
          email: "${collaboratorA['x-user-email']}",
          name: "A",
          image: null
        }) {id status}}`,
        owner,
      );

      const body = await graphql<{
        declineInvite: { id: string; status: ListShareStatus };
      }>(
        `
          mutation {
            declineInvite(shareId: "${listShare.data!.inviteToList.id}") {
              id
              status
            }
          }
        `,
        collaboratorB,
      );

      expect(body.data).toBeNull();
      expect(body.errors?.[0]).toBeDefined();
    });

    it('denies acceptInvite for an already-responded share', async () => {
      const { owner, listId } = await getOwnerAndList();
      const collaboratorA = asUser('collaborator-a', 'a@example.com');

      const listShare = await graphql<{
        inviteToList: { id: string; status: ListShareStatus };
      }>(
        `mutation {inviteToList(listId: "${listId}", candidate: {
          hubUserId: "${collaboratorA['x-user-id']}",
          email: "${collaboratorA['x-user-email']}",
          name: "A",
          image: null
        }) {id status}}`,
        owner,
      );

      await testDb.listShare.update({
        where: { id: listShare.data?.inviteToList.id },
        data: {
          status: ListShareStatus.accepted,
          respondedAt: new Date(),
        },
      });

      const body = await graphql<{
        acceptInvite: { id: string; status: ListShareStatus };
      }>(
        `
          mutation {
            acceptInvite(shareId: "${listShare.data!.inviteToList.id}") {
              id
              status
            }
          }
        `,
        collaboratorA,
      );

      expect(body.data).toBeNull();
      expect(body.errors?.[0]).toBeDefined();
    });

    it('denies declineInvite for an already-responded share', async () => {
      const { owner, listId } = await getOwnerAndList();
      const collaboratorA = asUser('collaborator-a', 'a@example.com');

      const listShare = await graphql<{
        inviteToList: { id: string; status: ListShareStatus };
      }>(
        `mutation {inviteToList(listId: "${listId}", candidate: {
          hubUserId: "${collaboratorA['x-user-id']}",
          email: "${collaboratorA['x-user-email']}",
          name: "A",
          image: null
        }) {id status}}`,
        owner,
      );

      await testDb.listShare.update({
        where: { id: listShare.data?.inviteToList.id },
        data: {
          status: ListShareStatus.accepted,
          respondedAt: new Date(),
        },
      });

      const body = await graphql<{
        declineInvite: { id: string; status: ListShareStatus };
      }>(
        `
          mutation {
            declineInvite(shareId: "${listShare.data!.inviteToList.id}") {
              id
              status
            }
          }
        `,
        collaboratorA,
      );

      expect(body.data).toBeNull();
      expect(body.errors?.[0]).toBeDefined();
    });

    it('accepts a pending invite and sets respondedAt', async () => {
      const { owner, listId } = await getOwnerAndList();
      const collaboratorA = asUser('collaborator-a', 'a@example.com');

      const listShare = await graphql<{
        inviteToList: { id: string; status: ListShareStatus };
      }>(
        `mutation {inviteToList(listId: "${listId}", candidate: {
          hubUserId: "${collaboratorA['x-user-id']}",
          email: "${collaboratorA['x-user-email']}",
          name: "A",
          image: null
        }) {id status}}`,
        owner,
      );

      const body = await graphql<{
        acceptInvite: {
          id: string;
          status: ListShareStatus;
          respondedAt: string;
        };
      }>(
        `
          mutation {
            acceptInvite(shareId: "${listShare.data!.inviteToList.id}") {
              id
              status
              respondedAt
            }
          }
        `,
        collaboratorA,
      );

      const respondedAtData = await testDb.listShare.findUnique({
        where: { id: listShare.data?.inviteToList.id },
        select: { respondedAt: true },
      });

      expect(body.errors).toBeUndefined();
      expect(body.data?.acceptInvite.status).toBe(ListShareStatus.accepted);
      expect(body.data?.acceptInvite.respondedAt).toBe(
        respondedAtData?.respondedAt?.toISOString(),
      );
    });

    it('declines a pending invite and sets respondedAt', async () => {
      const { owner, listId } = await getOwnerAndList();
      const collaboratorA = asUser('collaborator-a', 'a@example.com');

      const listShare = await graphql<{
        inviteToList: { id: string; status: ListShareStatus };
      }>(
        `mutation {inviteToList(listId: "${listId}", candidate: {
          hubUserId: "${collaboratorA['x-user-id']}",
          email: "${collaboratorA['x-user-email']}",
          name: "A",
          image: null
        }) {id status}}`,
        owner,
      );

      const body = await graphql<{
        declineInvite: {
          id: string;
          status: ListShareStatus;
          respondedAt: string;
        };
      }>(
        `
          mutation {
            declineInvite(shareId: "${listShare.data!.inviteToList.id}") {
              id
              status
              respondedAt
            }
          }
        `,
        collaboratorA,
      );

      const respondedAtData = await testDb.listShare.findUnique({
        where: { id: listShare.data?.inviteToList.id },
        select: { respondedAt: true },
      });

      expect(body.errors).toBeUndefined();
      expect(body.data?.declineInvite.status).toBe(ListShareStatus.declined);
      expect(body.data?.declineInvite.respondedAt).toBe(
        respondedAtData?.respondedAt?.toISOString(),
      );
    });
  });

  describe('removing a collaborator (removeCollaborator / leaveList)', () => {
    it('removes the ListShare row and immediately denies further access', async () => {
      const { owner, listId } = await getOwnerAndList();
      const collaboratorA = asUser('collaborator-a', 'a@example.com');

      const listShare = await graphql<{
        inviteToList: { id: string; status: ListShareStatus };
      }>(
        `mutation {inviteToList(listId: "${listId}", candidate: {
          hubUserId: "${collaboratorA['x-user-id']}",
          email: "${collaboratorA['x-user-email']}",
          name: "A",
          image: null
        }) {id status}}`,
        owner,
      );

      const taskBody = await graphql<{ createTask: { id: string } }>(
        `mutation {createTask(listId: "${listId}", title: "Test task"){id}}`,
        owner,
      );

      const acceptedInvite = await graphql<{
        acceptInvite: {
          id: string;
          status: ListShareStatus;
          respondedAt: string;
          user: { id: string };
        };
      }>(
        `
          mutation {
            acceptInvite(shareId: "${listShare.data!.inviteToList.id}") {
              id
              status
              respondedAt
              user {id}
            }
          }
        `,
        collaboratorA,
      );

      const body = await graphql<{ removeCollaborator: boolean }>(
        `mutation {removeCollaborator(listId: "${listId}", targetUserId: "${acceptedInvite.data?.acceptInvite.user.id}")}`,
        owner,
      );

      expect(body.errors).toBeUndefined();
      expect(body.data?.removeCollaborator).toBe(true);

      const list = await graphql<{ list: { id: string } }>(
        `query {list(id: "${listId}"){id}}`,
        collaboratorA,
      );

      expect(list.data).toBeNull();
      expect(list.errors).toBeDefined();

      const toggleTaskDoneBody = await graphql<{
        toggleTaskDone: { done: boolean };
      }>(
        `mutation {toggleTaskDone(id: "${taskBody.data?.createTask.id}"){done}}`,
        collaboratorA,
      );

      expect(toggleTaskDoneBody.data).toBeNull();
      expect(toggleTaskDoneBody.errors).toBeDefined();
    });

    it('denies removeCollaborator for a non-owner', async () => {
      const { owner, listId } = await getOwnerAndList();
      const collaboratorA = asUser('collaborator-a', 'a@example.com');
      const collaboratorB = asUser('collaborator-b', 'b@example.com');

      const listShare = await graphql<{
        inviteToList: { id: string; status: ListShareStatus };
      }>(
        `mutation {inviteToList(listId: "${listId}", candidate: {
          hubUserId: "${collaboratorA['x-user-id']}",
          email: "${collaboratorA['x-user-email']}",
          name: "A",
          image: null
        }) {id status}}`,
        owner,
      );

      const acceptedInvite = await graphql<{
        acceptInvite: {
          id: string;
          status: ListShareStatus;
          respondedAt: string;
          user: { id: string };
        };
      }>(
        `
          mutation {
            acceptInvite(shareId: "${listShare.data!.inviteToList.id}") {
              id
              status
              respondedAt
              user {id}
            }
          }
        `,
        collaboratorA,
      );

      const body = await graphql<{ removeCollaborator: boolean }>(
        `mutation {removeCollaborator(listId: "${listId}", targetUserId: "${acceptedInvite.data?.acceptInvite.user.id}")}`,
        collaboratorB,
      );

      expect(body.data).toBeNull();
      expect(body.errors).toBeDefined();
    });

    it('removing one collaborator does not affect another collaborator on the same list', async () => {
      const { owner, listId } = await getOwnerAndList();
      const collaboratorA = asUser('collaborator-a', 'a@example.com');
      const collaboratorB = asUser('collaborator-b', 'b@example.com');

      const taskBody = await graphql<{ createTask: { id: string } }>(
        `mutation {createTask(listId: "${listId}", title: "Test task"){id}}`,
        owner,
      );

      const listShareA = await graphql<{
        inviteToList: { id: string; status: ListShareStatus };
      }>(
        `mutation {inviteToList(listId: "${listId}", candidate: {
          hubUserId: "${collaboratorA['x-user-id']}",
          email: "${collaboratorA['x-user-email']}",
          name: "A",
          image: null
        }) {id status}}`,
        owner,
      );

      const listShareB = await graphql<{
        inviteToList: { id: string; status: ListShareStatus };
      }>(
        `mutation {inviteToList(listId: "${listId}", candidate: {
          hubUserId: "${collaboratorB['x-user-id']}",
          email: "${collaboratorB['x-user-email']}",
          name: "B",
          image: null
        }) {id status}}`,
        owner,
      );

      const acceptedInviteA = await graphql<{
        acceptInvite: {
          id: string;
          status: ListShareStatus;
          respondedAt: string;
          user: { id: string };
        };
      }>(
        `
          mutation {
            acceptInvite(shareId: "${listShareA.data!.inviteToList.id}") {
              id
              status
              respondedAt
              user {id}
            }
          }
        `,
        collaboratorA,
      );

      await graphql<{
        acceptInvite: {
          id: string;
          status: ListShareStatus;
          respondedAt: string;
          user: { id: string };
        };
      }>(
        `
          mutation {
            acceptInvite(shareId: "${listShareB.data!.inviteToList.id}") {
              id
              status
              respondedAt
              user {id}
            }
          }
        `,
        collaboratorB,
      );

      await graphql<{ removeCollaborator: boolean }>(
        `mutation {removeCollaborator(listId: "${listId}", targetUserId: "${acceptedInviteA.data?.acceptInvite.user.id}")}`,
        owner,
      );

      const body = await graphql<{
        toggleTaskDone: { done: boolean };
      }>(
        `mutation {toggleTaskDone(id: "${taskBody.data?.createTask.id}"){done}}`,
        collaboratorB,
      );

      expect(body.errors).toBeUndefined();
      expect(body.data?.toggleTaskDone.done).toBeTruthy();
    });

    it("leaveList removes the caller's own ListShare row", async () => {
      const { owner, listId } = await getOwnerAndList();
      const collaboratorA = asUser('collaborator-a', 'a@example.com');

      const taskBody = await graphql<{ createTask: { id: string } }>(
        `mutation {createTask(listId: "${listId}", title: "Test task"){id}}`,
        owner,
      );

      const listShare = await graphql<{
        inviteToList: { id: string; status: ListShareStatus };
      }>(
        `mutation {inviteToList(listId: "${listId}", candidate: {
          hubUserId: "${collaboratorA['x-user-id']}",
          email: "${collaboratorA['x-user-email']}",
          name: "A",
          image: null
        }) {id status}}`,
        owner,
      );

      const acceptedInvite = await graphql<{
        acceptInvite: {
          id: string;
          status: ListShareStatus;
          respondedAt: string;
          user: { id: string };
        };
      }>(
        `
          mutation {
            acceptInvite(shareId: "${listShare.data!.inviteToList.id}") {
              id
              status
              respondedAt
              user {id}
            }
          }
        `,
        collaboratorA,
      );

      expect(acceptedInvite.errors).toBeUndefined();
      expect(acceptedInvite.data?.acceptInvite.status).toBe(
        ListShareStatus.accepted,
      );

      const leaveListBody = await graphql<{ leaveList: boolean }>(
        `mutation {leaveList(listId: "${listId}")}`,
        collaboratorA,
      );

      expect(leaveListBody.errors).toBeUndefined();
      expect(leaveListBody.data?.leaveList).toBe(true);

      const toggleTaskBody = await graphql<{
        toggleTaskDone: { done: boolean };
      }>(
        `mutation {toggleTaskDone(id: "${taskBody.data?.createTask.id}"){done}}`,
        collaboratorA,
      );

      expect(toggleTaskBody.data).toBeNull();
      expect(toggleTaskBody.errors).toBeDefined();
    });

    it('denies leaveList for a user with no share on the list', async () => {
      const { listId } = await getOwnerAndList();
      const collaboratorA = asUser('collaborator-a', 'a@example.com');

      const leaveListBody = await graphql<{ leaveList: boolean }>(
        `mutation {leaveList(listId: "${listId}")}`,
        collaboratorA,
      );

      expect(leaveListBody.data).toBeNull();
      expect(leaveListBody.errors).toBeDefined();
    });
  });

  describe('collaborator permission boundary', () => {
    async function inviteAndAccept(
      owner: Record<string, string>,
      listId: string,
      collaborator: Record<string, string>,
      name: string,
    ) {
      const listShare = await graphql<{
        inviteToList: { id: string; status: ListShareStatus };
      }>(
        `mutation {inviteToList(listId: "${listId}", candidate: {
          hubUserId: "${collaborator['x-user-id']}",
          email: "${collaborator['x-user-email']}",
          name: "${name}",
          image: null
        }) {id status}}`,
        owner,
      );

      await graphql(
        `mutation {acceptInvite(shareId: "${listShare.data!.inviteToList.id}") {id}}`,
        collaborator,
      );
    }

    it('allows the owner to perform every list/task/sharing operation', async () => {
      const { owner, listId } = await getOwnerAndList();
      const collaboratorA = asUser('collaborator-a', 'a@example.com');

      const taskBody = await graphql<{ createTask: { id: string } }>(
        `mutation {createTask(listId: "${listId}", title: "Task 1"){id}}`,
        owner,
      );
      const taskId = taskBody.data!.createTask.id;
      expect(taskBody.errors).toBeUndefined();

      const listQuery = await graphql<{ list: { id: string } }>(
        `query {list(id: "${listId}"){id}}`,
        owner,
      );
      expect(listQuery.errors).toBeUndefined();
      expect(listQuery.data?.list.id).toBe(listId);

      const toggleBody = await graphql<{ toggleTaskDone: { done: boolean } }>(
        `mutation {toggleTaskDone(id: "${taskId}"){done}}`,
        owner,
      );
      expect(toggleBody.errors).toBeUndefined();
      expect(toggleBody.data?.toggleTaskDone.done).toBe(true);

      const updateBody = await graphql<{ updateTask: { title: string } }>(
        `mutation {updateTask(id: "${taskId}", title: "Task 1 updated"){title}}`,
        owner,
      );
      expect(updateBody.errors).toBeUndefined();
      expect(updateBody.data?.updateTask.title).toBe('Task 1 updated');

      const reorderBody = await graphql<{ reorderTasks: { id: string }[] }>(
        `mutation {reorderTasks(listId: "${listId}", taskIds: ["${taskId}"]){id}}`,
        owner,
      );
      expect(reorderBody.errors).toBeUndefined();
      expect(reorderBody.data?.reorderTasks).toHaveLength(1);

      const renameBody = await graphql<{ renameList: { title: string } }>(
        `mutation {renameList(id: "${listId}", title: "Groceries 2"){title}}`,
        owner,
      );
      expect(renameBody.errors).toBeUndefined();
      expect(renameBody.data?.renameList.title).toBe('Groceries 2');

      jest
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce(new Response(JSON.stringify([])));
      const searchBody = await graphql<{ searchShareCandidates: unknown[] }>(
        `query {searchShareCandidates(listId: "${listId}", q: "a"){hubUserId}}`,
        owner,
      );
      jest.restoreAllMocks();
      expect(searchBody.errors).toBeUndefined();

      const inviteBody = await graphql<{
        inviteToList: { id: string; status: ListShareStatus };
      }>(
        `mutation {inviteToList(listId: "${listId}", candidate: {
          hubUserId: "${collaboratorA['x-user-id']}",
          email: "${collaboratorA['x-user-email']}",
          name: "A",
          image: null
        }) {id status}}`,
        owner,
      );
      expect(inviteBody.errors).toBeUndefined();

      const acceptedInvite = await graphql<{
        acceptInvite: { user: { id: string } };
      }>(
        `mutation {acceptInvite(shareId: "${inviteBody.data!.inviteToList.id}") {user {id}}}`,
        collaboratorA,
      );

      const removeBody = await graphql<{ removeCollaborator: boolean }>(
        `mutation {removeCollaborator(listId: "${listId}", targetUserId: "${acceptedInvite.data?.acceptInvite.user.id}")}`,
        owner,
      );
      expect(removeBody.errors).toBeUndefined();
      expect(removeBody.data?.removeCollaborator).toBe(true);

      const deleteTaskBody = await graphql<{ deleteTask: boolean }>(
        `mutation {deleteTask(id: "${taskId}")}`,
        owner,
      );
      expect(deleteTaskBody.errors).toBeUndefined();
      expect(deleteTaskBody.data?.deleteTask).toBe(true);

      const deleteListBody = await graphql<{ deleteList: boolean }>(
        `mutation {deleteList(id: "${listId}")}`,
        owner,
      );
      expect(deleteListBody.errors).toBeUndefined();
      expect(deleteListBody.data?.deleteList).toBe(true);
    });

    it('allows an accepted collaborator to view the list and toggle tasks done, denies the rest', async () => {
      const { owner, listId } = await getOwnerAndList();
      const collaboratorA = asUser('collaborator-a', 'a@example.com');
      const taskBody = await graphql<{ createTask: { id: string } }>(
        `mutation {createTask(listId: "${listId}", title: "Task 1"){id}}`,
        owner,
      );
      const taskId = taskBody.data!.createTask.id;

      await inviteAndAccept(owner, listId, collaboratorA, 'A');

      const listQuery = await graphql<{ list: { id: string } }>(
        `query {list(id: "${listId}"){id}}`,
        collaboratorA,
      );
      expect(listQuery.errors).toBeUndefined();
      expect(listQuery.data?.list.id).toBe(listId);

      const toggleBody = await graphql<{ toggleTaskDone: { done: boolean } }>(
        `mutation {toggleTaskDone(id: "${taskId}"){done}}`,
        collaboratorA,
      );
      expect(toggleBody.errors).toBeUndefined();
      expect(toggleBody.data?.toggleTaskDone.done).toBe(true);

      const createTaskBody = await graphql<{ createTask: { id: string } }>(
        `mutation {createTask(listId: "${listId}", title: "Task 2"){id}}`,
        collaboratorA,
      );
      expect(createTaskBody.data).toBeNull();
      expect(createTaskBody.errors).toBeDefined();

      const updateTaskBody = await graphql<{ updateTask: { title: string } }>(
        `mutation {updateTask(id: "${taskId}", title: "Hijacked"){title}}`,
        collaboratorA,
      );
      expect(updateTaskBody.data).toBeNull();
      expect(updateTaskBody.errors).toBeDefined();

      const deleteTaskBody = await graphql<{ deleteTask: boolean }>(
        `mutation {deleteTask(id: "${taskId}")}`,
        collaboratorA,
      );
      expect(deleteTaskBody.data).toBeNull();
      expect(deleteTaskBody.errors).toBeDefined();

      const reorderBody = await graphql<{ reorderTasks: { id: string }[] }>(
        `mutation {reorderTasks(listId: "${listId}", taskIds: ["${taskId}"]){id}}`,
        collaboratorA,
      );
      expect(reorderBody.data).toBeNull();
      expect(reorderBody.errors).toBeDefined();

      const renameBody = await graphql<{ renameList: { title: string } }>(
        `mutation {renameList(id: "${listId}", title: "Hijacked"){title}}`,
        collaboratorA,
      );
      expect(renameBody.data).toBeNull();
      expect(renameBody.errors).toBeDefined();

      const deleteListBody = await graphql<{ deleteList: boolean }>(
        `mutation {deleteList(id: "${listId}")}`,
        collaboratorA,
      );
      expect(deleteListBody.data).toBeNull();
      expect(deleteListBody.errors).toBeDefined();

      const inviteBody = await graphql<{
        inviteToList: { id: string; status: ListShareStatus };
      }>(
        `mutation {inviteToList(listId: "${listId}", candidate: {
          hubUserId: "collaborator-b",
          email: "b@example.com",
          name: "B",
          image: null
        }) {id status}}`,
        collaboratorA,
      );
      expect(inviteBody.data).toBeNull();
      expect(inviteBody.errors).toBeDefined();

      const removeBody = await graphql<{ removeCollaborator: boolean }>(
        `mutation {removeCollaborator(listId: "${listId}", targetUserId: "${collaboratorA['x-user-id']}")}`,
        collaboratorA,
      );
      expect(removeBody.data).toBeNull();
      expect(removeBody.errors).toBeDefined();

      const searchBody = await graphql<{ searchShareCandidates: unknown[] }>(
        `query {searchShareCandidates(listId: "${listId}", q: "a"){hubUserId}}`,
        collaboratorA,
      );
      expect(searchBody.data).toBeNull();
      expect(searchBody.errors).toBeDefined();
    });

    it('denies all access to a user with only a pending or declined share', async () => {
      const { owner, listId } = await getOwnerAndList();
      const collaboratorA = asUser('collaborator-a', 'a@example.com');
      const taskBody = await graphql<{ createTask: { id: string } }>(
        `mutation {createTask(listId: "${listId}", title: "Task 1"){id}}`,
        owner,
      );
      const taskId = taskBody.data!.createTask.id;

      const listShare = await graphql<{
        inviteToList: { id: string; status: ListShareStatus };
      }>(
        `mutation {inviteToList(listId: "${listId}", candidate: {
          hubUserId: "${collaboratorA['x-user-id']}",
          email: "${collaboratorA['x-user-email']}",
          name: "A",
          image: null
        }) {id status}}`,
        owner,
      );

      const pendingList = await graphql<{ list: { id: string } }>(
        `query {list(id: "${listId}"){id}}`,
        collaboratorA,
      );
      expect(pendingList.data).toBeNull();
      expect(pendingList.errors).toBeDefined();

      const pendingToggle = await graphql<{
        toggleTaskDone: { done: boolean };
      }>(`mutation {toggleTaskDone(id: "${taskId}"){done}}`, collaboratorA);
      expect(pendingToggle.data).toBeNull();
      expect(pendingToggle.errors).toBeDefined();

      await testDb.listShare.update({
        where: { id: listShare.data!.inviteToList.id },
        data: { status: ListShareStatus.declined, respondedAt: new Date() },
      });

      const declinedList = await graphql<{ list: { id: string } }>(
        `query {list(id: "${listId}"){id}}`,
        collaboratorA,
      );
      expect(declinedList.data).toBeNull();
      expect(declinedList.errors).toBeDefined();

      const declinedToggle = await graphql<{
        toggleTaskDone: { done: boolean };
      }>(`mutation {toggleTaskDone(id: "${taskId}"){done}}`, collaboratorA);
      expect(declinedToggle.data).toBeNull();
      expect(declinedToggle.errors).toBeDefined();
    });

    it('denies all access to a user with no relationship to the list', async () => {
      const { owner, listId } = await getOwnerAndList();
      const stranger = asUser('stranger-1', 'stranger@example.com');
      const taskBody = await graphql<{ createTask: { id: string } }>(
        `mutation {createTask(listId: "${listId}", title: "Task 1"){id}}`,
        owner,
      );
      const taskId = taskBody.data!.createTask.id;

      const listQuery = await graphql<{ list: { id: string } }>(
        `query {list(id: "${listId}"){id}}`,
        stranger,
      );
      expect(listQuery.data).toBeNull();
      expect(listQuery.errors).toBeDefined();

      const toggleBody = await graphql<{ toggleTaskDone: { done: boolean } }>(
        `mutation {toggleTaskDone(id: "${taskId}"){done}}`,
        stranger,
      );
      expect(toggleBody.data).toBeNull();
      expect(toggleBody.errors).toBeDefined();
    });

    it('myLists includes the shared list for an accepted collaborator', async () => {
      const { owner, listId } = await getOwnerAndList();
      const collaboratorA = asUser('collaborator-a', 'a@example.com');

      await inviteAndAccept(owner, listId, collaboratorA, 'A');

      const body = await graphql<{ myLists: { id: string }[] }>(
        `
          query {
            myLists {
              id
            }
          }
        `,
        collaboratorA,
      );

      expect(body.errors).toBeUndefined();
      expect(body.data?.myLists.map((list) => list.id)).toContain(listId);
    });

    it('myLists excludes the shared list for a pending, declined, or unrelated user', async () => {
      const { owner, listId } = await getOwnerAndList();
      const collaboratorA = asUser('collaborator-a', 'a@example.com');
      const stranger = asUser('stranger-1', 'stranger@example.com');

      const listShare = await graphql<{
        inviteToList: { id: string; status: ListShareStatus };
      }>(
        `mutation {inviteToList(listId: "${listId}", candidate: {
          hubUserId: "${collaboratorA['x-user-id']}",
          email: "${collaboratorA['x-user-email']}",
          name: "A",
          image: null
        }) {id status}}`,
        owner,
      );

      const pendingBody = await graphql<{ myLists: { id: string }[] }>(
        `
          query {
            myLists {
              id
            }
          }
        `,
        collaboratorA,
      );
      expect(pendingBody.errors).toBeUndefined();
      expect(pendingBody.data?.myLists.map((list) => list.id)).not.toContain(
        listId,
      );

      await testDb.listShare.update({
        where: { id: listShare.data!.inviteToList.id },
        data: { status: ListShareStatus.declined, respondedAt: new Date() },
      });

      const declinedBody = await graphql<{ myLists: { id: string }[] }>(
        `
          query {
            myLists {
              id
            }
          }
        `,
        collaboratorA,
      );
      expect(declinedBody.errors).toBeUndefined();
      expect(declinedBody.data?.myLists.map((list) => list.id)).not.toContain(
        listId,
      );

      const strangerBody = await graphql<{ myLists: { id: string }[] }>(
        `
          query {
            myLists {
              id
            }
          }
        `,
        stranger,
      );
      expect(strangerBody.errors).toBeUndefined();
      expect(strangerBody.data?.myLists.map((list) => list.id)).not.toContain(
        listId,
      );
    });
  });
});
