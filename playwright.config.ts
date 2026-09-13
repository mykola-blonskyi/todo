import { defineConfig, devices } from '@playwright/test';
import {
  AUTH_SECRET,
  BACKEND_URL,
  DATABASE_URL,
  FRONTEND_URL,
} from './e2e/setup/constants';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // `github` alone writes no file - CI uploads this report on failure, so
  // the run needs the HTML reporter alongside it to have something to upload.
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  globalSetup: './e2e/setup/global-setup.ts',
  use: {
    baseURL: FRONTEND_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Every env value below except DATABASE_URL, the ports, and the two app
  // URLs is a dummy never dereferenced over the network - the two apps just
  // need it present to boot. Inlined here so a local run needs no .env file.
  webServer: [
    {
      name: 'backend',
      command:
        'pnpm --filter backend exec prisma migrate deploy && pnpm --filter backend build && pnpm --filter backend start:prod',
      url: BACKEND_URL,
      timeout: 180_000,
      reuseExistingServer: !process.env.CI,
      env: {
        DATABASE_URL,
        PORT: '4000',
        HUB_URL: 'http://hub.test',
        PROJECT_SLUG: 'todolist-ci',
        TOKEN_ENCRYPTION_KEY: 'y6pTgWQY7Sl4qAIAYKKubuJjYOXMxr0yfPWWBHNCsRQ=',
        GOOGLE_CLIENT_ID: 'e2e-dummy-google-client-id',
        GOOGLE_CLIENT_SECRET: 'e2e-dummy-google-client-secret',
      },
    },
    {
      name: 'frontend',
      command: 'pnpm --filter frontend build && pnpm --filter frontend start',
      url: `${FRONTEND_URL}/api/health`,
      // A cold Next build on a CI runner is slow.
      timeout: 300_000,
      reuseExistingServer: !process.env.CI,
      env: {
        APP_URL: FRONTEND_URL,
        AUTH_URL: `${FRONTEND_URL}/api/auth`,
        AUTH_SECRET,
        AUTH_TRUST_HOST: 'true',
        BACKEND_URL: `${BACKEND_URL}/graphql`,
        OIDC_ISSUER: 'https://oidc.test',
        OIDC_CLIENT_SECRET: 'e2e-dummy-oidc-client-secret',
        HUB_URL: 'http://hub.test',
      },
    },
  ],
});
