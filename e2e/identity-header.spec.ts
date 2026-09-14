import { test, expect } from '@playwright/test';
import { E2E_USER, E2E_LIST } from './setup/constants';

const forged = {
  'x-user-id': E2E_USER.identitySub,
  'x-user-email': E2E_USER.email,
};

// The backend trusts x-user-id and x-user-email absolutely (ADR-003), so the
// only thing between a stranger and any account is that the frontend never
// reads them off an inbound request. Both routes below reached the backend
// with a forged header before ADR-018: /en/login because the proxy returned
// early on public paths, and a dotted path because the matcher excluded it
// while the route behind it still rendered.
test.describe('a forged identity header', () => {
  test('gets no data from a public page', async ({ request }) => {
    const response = await request.get('/en/login', { headers: forged });
    const html = await response.text();

    // Asserted first, so "contains no list" cannot pass by the page having
    // failed to render at all.
    expect(response.status()).toBe(200);
    expect(html).toContain('Sign in to access your lists');

    expect(html).not.toContain(E2E_LIST.title);
    expect(html).not.toContain(E2E_USER.email);
    expect(html).not.toContain(E2E_USER.name);
  });

  test('does not get a dotted page path past the login gate', async ({
    page,
  }) => {
    await page.setExtraHTTPHeaders(forged);

    await page.goto('/en/lists/foo.bar');

    await expect(page).toHaveURL(/\/en\/login\?callbackUrl=/);
  });

  test('does not stand in for a session on a gated page', async ({ page }) => {
    await page.setExtraHTTPHeaders(forged);

    await page.goto('/en');

    await expect(page).toHaveURL(/\/en\/login\?callbackUrl=/);
  });
});
