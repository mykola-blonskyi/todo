import { Prisma, PrismaClient } from '@prisma/client';
import { DATABASE_URL, E2E_LIST, E2E_USER } from './constants';

const prisma = new PrismaClient({
  datasources: { db: { url: DATABASE_URL } },
});

// Fixture rows carry fixed ids, so losing the insert race - to a parallel run,
// or to a previous run against the same warm database - means the row is
// already exactly what this one would have written.
async function createIgnoringDuplicate(
  insert: () => Promise<unknown>,
): Promise<void> {
  try {
    await insert();
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return;
    }
    throw error;
  }
}

export async function seedFixtures(): Promise<void> {
  await createIgnoringDuplicate(() =>
    prisma.user.create({
      data: {
        id: E2E_USER.id,
        identitySub: E2E_USER.identitySub,
        email: E2E_USER.email,
        name: E2E_USER.name,
      },
    }),
  );

  await createIgnoringDuplicate(() =>
    prisma.list.create({
      data: {
        id: E2E_LIST.id,
        title: E2E_LIST.title,
        ownerId: E2E_USER.id,
      },
    }),
  );

  await prisma.$disconnect();
}
