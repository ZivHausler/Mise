import { test as setup, expect, type APIRequestContext } from '@playwright/test';

const authFile = 'tests/.auth/user.json';

const TEST_USER = {
  name: 'E2E Test User',
  email: `e2e-${Date.now()}@mise-test.local`,
  password: 'TestPass123',
  storeName: 'E2E Test Bakery',
};

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3001';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'dev-admin-secret-change-in-production';

async function apiPost(request: APIRequestContext, url: string, options: Record<string, unknown>) {
  const maxRetries = 3;
  for (let i = 0; i < maxRetries; i++) {
    const res = await request.post(url, options);
    if (res.status() === 429) {
      // Rate limited — wait and retry
      const wait = (i + 1) * 5_000;
      console.log(`Rate limited on ${url}, retrying in ${wait}ms...`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    return res;
  }
  return request.post(url, options);
}

setup('authenticate', async ({ page, request }) => {
  // Step 1: Create an invite via admin API
  const inviteResponse = await apiPost(request, `${API_BASE}/api/stores/admin/invite-create-store`, {
    headers: { Authorization: `Bearer ${ADMIN_SECRET}` },
    data: { email: TEST_USER.email },
  });
  expect(inviteResponse.ok(), `Invite failed: ${inviteResponse.status()} ${await inviteResponse.text()}`).toBeTruthy();
  const inviteData = await inviteResponse.json();
  const inviteToken = inviteData.data.token;
  expect(inviteToken).toBeTruthy();

  // Step 2: Register via API
  const registerResponse = await apiPost(request, `${API_BASE}/api/auth/register`, {
    data: {
      name: TEST_USER.name,
      email: TEST_USER.email,
      password: TEST_USER.password,
      inviteToken,
    },
  });
  expect(registerResponse.ok(), `Register failed: ${registerResponse.status()} ${await registerResponse.text()}`).toBeTruthy();
  const registerData = await registerResponse.json();
  const authToken = registerData.data.token;

  // Step 3: Create store via API
  const storeResponse = await apiPost(request, `${API_BASE}/api/stores`, {
    headers: { Authorization: `Bearer ${authToken}` },
    data: { name: TEST_USER.storeName, inviteToken },
  });
  const storeBody = await storeResponse!.json();
  expect(storeResponse!.ok(), `Store creation failed: ${storeResponse!.status()}`).toBeTruthy();

  // Step 4: Login via UI to capture browser auth state
  await page.goto('/login');
  await page.getByLabel('Email').fill(TEST_USER.email);
  await page.getByLabel('Password').fill(TEST_USER.password);
  await page.getByRole('button', { name: 'Log In' }).click();

  // Step 5: Wait for redirect to dashboard (authenticated state)
  await page.waitForURL('/', { timeout: 15_000 });

  // Step 6: Complete onboarding using the browser's own auth token
  // This ensures the token has the correct storeId from the auto-selected store
  await page.evaluate(async () => {
    const authState = localStorage.getItem('auth-storage');
    if (authState) {
      const parsed = JSON.parse(authState);
      const token = parsed?.state?.token;
      if (token) {
        await fetch('/api/settings/onboarding/complete', {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    }
  });

  // Step 7: Reload so the tour state is refreshed
  await page.reload();
  await page.waitForURL('/', { timeout: 15_000 });

  // Save storage state
  await page.context().storageState({ path: authFile });
});
