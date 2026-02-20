import { test as teardown } from '@playwright/test';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3001';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'dev-admin-secret-change-in-production';

teardown('cleanup', async ({ request }) => {
  // Delete all test users (and their audit logs, stores, invitations)
  const res = await request.post(`${API_BASE}/api/admin/cleanup-test-users`, {
    headers: { Authorization: `Bearer ${ADMIN_SECRET}` },
    data: { emailPattern: '%@mise-test.local' },
  });

  if (res.ok()) {
    const body = await res.json();
    console.log(`Cleaned up ${body.data.deleted} test user(s)`);
  } else {
    console.warn(`Test cleanup failed: ${res.status()} ${await res.text()}`);
  }
});
