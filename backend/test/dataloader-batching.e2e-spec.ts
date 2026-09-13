import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { stubHubProjectMembers } from './setup/hub';

interface GraphQLResponse<T> {
  data: T | null;
  errors?: { extensions: { code: string } }[];
}

// Every candidate any test in this file invites, so requireProjectMember
// (Rule 4) finds them on the hub roster.
const HUB_MEMBERS = [
  { hubUserId: 'collab-1', email: 'collab@example.com', name: 'Collab' },
];

// Regression guard for TODO-47: proves the fan-out query below issues the
// same number of DB queries whether myLists returns one List or three -
// i.e. genuinely O(1) in row count, not O(n). Reverting the @Loaders()
// wiring back to direct per-row service calls would make this test fail by
// tripling the query count for the 3-List case.
describe('DataLoader batching (myLists fan-out)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let queryCount = 0;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    stubHubProjectMembers(HUB_MEMBERS);

    prisma = app.get(PrismaService);
    queryCount = 0;
    prisma.$on('query', () => {
      queryCount += 1;
    });
  });

  afterEach(async () => {
    await app.close();
  });

  function asUser(identitySub: string, email: string) {
    // inviteToList now needs a session cookie too (requireProjectMember).
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

  async function seedListWithTaskAndCollaborator(
    owner: Record<string, string>,
    collaborator: Record<string, string>,
    categoryId: string,
    title: string,
  ) {
    const createBody = await graphql<{ createList: { id: string } }>(
      `mutation {createList(title: "${title}") {id}}`,
      owner,
    );
    const listId = createBody.data!.createList.id;

    await graphql(
      `mutation {createTask(listId: "${listId}", title: "Task"){id}}`,
      owner,
    );

    await graphql(
      `mutation {addComment(listId: "${listId}", body: "Hello"){id}}`,
      owner,
    );

    await graphql(
      `mutation {assignListCategory(listId: "${listId}", categoryId: "${categoryId}")}`,
      owner,
    );

    const inviteBody = await graphql<{ inviteToList: { id: string } }>(
      `mutation {inviteToList(listId: "${listId}", candidate: {
        hubUserId: "${collaborator['x-user-id']}",
        email: "${collaborator['x-user-email']}",
        name: "Collab",
        image: null
      }) {id}}`,
      owner,
    );

    await graphql(
      `mutation {acceptInvite(shareId: "${inviteBody.data!.inviteToList.id}"){id}}`,
      collaborator,
    );

    return listId;
  }

  const fanOutQuery = `
    query {
      myLists {
        id
        tasks { id comments { id } }
        collaborators { id }
        comments { id }
        myCategory { id }
        isOwner
      }
    }
  `;

  it('issues the same query count for one List as for three', async () => {
    const owner = asUser('owner-1', 'owner@example.com');
    const collaborator = asUser('collab-1', 'collab@example.com');

    const categoryBody = await graphql<{ createCategory: { id: string } }>(
      `
        mutation {
          createCategory(name: "Work") {
            id
          }
        }
      `,
      owner,
    );
    const categoryId = categoryBody.data!.createCategory.id;

    await seedListWithTaskAndCollaborator(
      owner,
      collaborator,
      categoryId,
      'List 1',
    );

    queryCount = 0;
    const singleListBody = await graphql<{ myLists: unknown[] }>(
      fanOutQuery,
      owner,
    );
    expect(singleListBody.errors).toBeUndefined();
    expect(singleListBody.data!.myLists).toHaveLength(1);
    const queryCountForOneList = queryCount;

    await seedListWithTaskAndCollaborator(
      owner,
      collaborator,
      categoryId,
      'List 2',
    );
    await seedListWithTaskAndCollaborator(
      owner,
      collaborator,
      categoryId,
      'List 3',
    );

    queryCount = 0;
    const threeListsBody = await graphql<{ myLists: unknown[] }>(
      fanOutQuery,
      owner,
    );
    expect(threeListsBody.errors).toBeUndefined();
    expect(threeListsBody.data!.myLists).toHaveLength(3);
    const queryCountForThreeLists = queryCount;

    expect(queryCountForThreeLists).toBe(queryCountForOneList);
  });

  // parseIdentity is now shared between IdentityGuard and the currentUser
  // loader (TODO-47) - this is the one behavior at risk from that move.
  it('still rejects a request with no identity headers', async () => {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: `query { myLists { id } }` });

    const body = res.body as GraphQLResponse<unknown>;
    expect(body.data).toBeNull();
    expect(body.errors?.[0]?.extensions.code).toBe('UNAUTHENTICATED');
  });
});
