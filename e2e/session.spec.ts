import { test, expect } from '@playwright/test';
import { signIn } from './setup/session';
import { E2E_USER, E2E_LIST } from './setup/constants';

test('a minted session renders the signed-in workspace', async ({
  context,
  page,
}) => {
  await signIn(context);
  await page.goto('/en');
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByText(E2E_USER.name)).toBeVisible();
  await expect(page.getByText(E2E_LIST.title)).toBeVisible();
});

test('an unauthenticated visit is redirected to login', async ({ page }) => {
  await page.goto('/en');
  await expect(page).toHaveURL(/\/en\/login$/);
});
