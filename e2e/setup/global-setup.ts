import { seedFixtures } from './db';

export default async function globalSetup(): Promise<void> {
  await seedFixtures();
}
