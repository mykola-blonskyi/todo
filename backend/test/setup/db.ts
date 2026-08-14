import { PrismaClient } from '@prisma/client';

export const TEST_DATABASE_URL =
  'postgresql://todolist_test:todolist_test@localhost:5436/todolist_test';

export const testDb = new PrismaClient({
  datasources: { db: { url: TEST_DATABASE_URL } },
});

export async function resetDb() {
  await testDb.$executeRawUnsafe(`
    TRUNCATE TABLE
      calendar_syncs, google_calendar_connections, comments, list_shares, tasks,
      template_collaborators, list_templates, categories, lists, users
    RESTART IDENTITY CASCADE
  `);
}

export async function closeDb() {
  await testDb.$disconnect();
}
