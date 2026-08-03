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
});
