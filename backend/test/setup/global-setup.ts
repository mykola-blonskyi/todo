import { execSync } from 'child_process';
import path from 'path';
import { TEST_DATABASE_URL } from './db';

export default function globalSetup() {
  execSync('npx prisma migrate deploy', {
    cwd: path.resolve(__dirname, '../..'),
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'inherit',
  });
}
