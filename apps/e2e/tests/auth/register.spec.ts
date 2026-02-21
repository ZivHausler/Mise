import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3001';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'dev-admin-secret-change-in-production';

async function createInvite(request: any, email: string) {
  const maxRetries = 3;
  for (let i = 0; i < maxRetries; i++) {
    const res = await request.post(`${API_BASE}/api/stores/admin/invite-create-store`, {
      headers: { Authorization: `Bearer ${ADMIN_SECRET}` },
      data: { email },
    });
    if (res.status() === 429) {
      const wait = (i + 1) * 2_000;
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    expect(res.ok(), `Invite creation failed: ${res.status()}`).toBeTruthy();
    const body = await res.json();
    return body.data.token as string;
  }
  // Final attempt
  const res = await request.post(`${API_BASE}/api/stores/admin/invite-create-store`, {
    headers: { Authorization: `Bearer ${ADMIN_SECRET}` },
    data: { email },
  });
  expect(res.ok(), `Invite creation failed after retries: ${res.status()}`).toBeTruthy();
  const body = await res.json();
  return body.data.token as string;
}

test.describe('Register page', () => {
  test.setTimeout(60_000);
  test('redirects to login without invite token', async ({ page }) => {
    await page.goto('/register');

    await expect(page).toHaveURL(/\/login/);
  });

  test('renders register form with invite token', async ({ page, request }) => {
    const token = await createInvite(request, `reg-render-${Date.now()}@mise-test.local`);

    await page.goto(`/register/${token}`);

    await expect(page.getByLabel('Name')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Register' })).toBeVisible();
  });

  test('shows password validation rules', async ({ page, request }) => {
    const token = await createInvite(request, `reg-pwd-${Date.now()}@mise-test.local`);

    await page.goto(`/register/${token}`);

    await page.getByLabel('Password').fill('weak');

    await expect(page.getByText('At least 8 characters')).toBeVisible();
    await expect(page.getByText('At least one uppercase letter')).toBeVisible();
    await expect(page.getByText('At least one number')).toBeVisible();
  });

  test('registers successfully with valid invite token', async ({ page, request }) => {
    const testEmail = `reg-success-${Date.now()}@mise-test.local`;
    const token = await createInvite(request, testEmail);

    await page.goto(`/register/${token}`);

    await page.getByLabel('Name').fill('Register Test');
    // Email is pre-filled and disabled from the invite — verify it has the correct value
    await expect(page.getByLabel('Email')).toHaveValue(testEmail);
    await page.getByLabel('Password').fill('ValidPass1');
    await page.getByRole('button', { name: 'Register' }).click();

    // Should redirect to store-setup after successful registration
    await expect(page).toHaveURL(/\/store-setup/, { timeout: 15_000 });
  });
});
