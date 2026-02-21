import { test, expect } from '@playwright/test';

// These tests run without stored auth state (no dependencies on setup project)
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Login page', () => {
  test('renders login form', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByText('Bakery Management')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log In' })).toBeVisible();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Email').fill('nonexistent@test.com');
    await page.getByLabel('Password').fill('WrongPassword1');
    await page.getByRole('button', { name: 'Log In' }).click();

    // Expect a toast/error to appear
    await expect(page.getByText(/failed|error|invalid/i)).toBeVisible({ timeout: 10_000 });
  });

  test('register link is hidden without invite token', async ({ page }) => {
    await page.goto('/login');

    // Register link only appears when an invite token is present in the URL
    await expect(page.getByRole('link', { name: 'Register' })).not.toBeVisible();
  });
});
