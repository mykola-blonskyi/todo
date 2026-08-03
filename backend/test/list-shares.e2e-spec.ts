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
});
