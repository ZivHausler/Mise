import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Protected routes', () => {
  test('redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/login/);
  });

  test('redirects unauthenticated user from orders page', async ({ page }) => {
    await page.goto('/orders');

    await expect(page).toHaveURL(/\/login/);
  });

  test('redirects unauthenticated user from settings page', async ({ page }) => {
    await page.goto('/settings');

    await expect(page).toHaveURL(/\/login/);
  });
});
