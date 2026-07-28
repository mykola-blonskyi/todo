import { resetDb, closeDb } from './db';

afterEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await closeDb();
});
