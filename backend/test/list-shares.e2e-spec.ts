import { INestApplication, Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import request from 'supertest';

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
});
