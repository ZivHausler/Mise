# E2E Testing Plan — Mise

## Tool: Playwright

Playwright is the best fit for this stack (React/Vite frontend + Fastify API + pnpm monorepo).

## Project Structure

```
apps/
  e2e/
    package.json
    playwright.config.ts
    fixtures/
      auth.fixture.ts        # Shared login/setup logic
    tests/
      auth/
        login.spec.ts
        register.spec.ts
        google-oauth.spec.ts
      store-setup/
        store-setup.spec.ts
      orders/
        order-crud.spec.ts
        order-status.spec.ts
      recipes/
        recipe-crud.spec.ts
        recipe-cost.spec.ts
      inventory/
        inventory-crud.spec.ts
        stock-adjust.spec.ts
      customers/
        customer-crud.spec.ts
      payments/
        payment-crud.spec.ts
        payment-summary.spec.ts
      settings/
        profile.spec.ts
        units.spec.ts
        groups.spec.ts
        notifications.spec.ts
      i18n/
        rtl-layout.spec.ts
        language-switch.spec.ts
```

## Playwright Config

The `playwright.config.ts` will use the `webServer` option to start both servers before tests run:

```ts
webServer: [
  {
    command: 'pnpm --filter @mise/api dev',
    port: 3001,
    reuseExistingServer: !process.env.CI,
  },
  {
    command: 'pnpm --filter @mise/web dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
],
```

## Test Database

Tests need an isolated database to avoid polluting dev data. Options:

1. **Separate Postgres DB** — `mise_test` database, seeded/reset before each test suite
2. **Docker Compose** — Spin up Postgres + Redis + MongoDB in containers for CI
3. **Transactions** — Wrap each test in a transaction and rollback (faster, but harder to set up with Playwright since the API runs in a separate process)

Recommended: **Option 1** for local dev, **Option 2** for CI.

A `global-setup.ts` script will:
- Reset the test database (run migrations, truncate tables)
- Seed essential data (e.g. a test user, a test store)
- Save authenticated state to `storageState` so tests skip the login flow

## Auth Fixture

Most tests need an authenticated user with a store. Use a shared Playwright fixture:

```ts
// fixtures/auth.fixture.ts
import { test as base } from '@playwright/test';

export const test = base.extend({
  authenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: 'tests/.auth/user.json',
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});
```

The `storageState` file is created once in `global-setup.ts` by logging in via the API and saving the cookies/tokens.

## Test Suites

### 1. Auth

| Test | What it covers |
|---|---|
| Register with email/password | Fill form, submit, verify redirect to store-setup |
| Login with email/password | Fill form, submit, verify redirect to dashboard |
| Login with wrong password | Verify error message |
| Protected route redirect | Visit `/orders` while unauthenticated, verify redirect to `/login` |
| Store setup redirect | Login without a store, verify redirect to `/store-setup` |

Google OAuth is hard to test end-to-end. Options:
- Mock the Google response at the API level in test mode
- Skip in E2E, cover in integration tests

### 2. Store Setup

| Test | What it covers |
|---|---|
| Create store | Fill store name, submit, verify redirect to dashboard |
| Store name appears | After setup, verify store name shows in sidebar/topbar |

### 3. Orders

| Test | What it covers |
|---|---|
| Create order | Navigate to /orders/new, fill form, submit, verify it appears in list |
| View order detail | Click an order, verify detail page shows correct data |
| Update order status | Change status on detail page, verify it updates |
| Delete order | Delete from detail page, verify it's removed from list |
| Pagination | Verify server-side pagination works (next/prev) |

### 4. Recipes

| Test | What it covers |
|---|---|
| Create recipe | Fill form with ingredients, submit, verify in list |
| Edit recipe | Modify a recipe, verify changes persist |
| Delete recipe | Delete and verify removal |
| Recipe cost calculation | Add ingredients, verify cost displays correctly |

### 5. Inventory

| Test | What it covers |
|---|---|
| Create ingredient | Add new ingredient, verify in list |
| Edit ingredient | Modify and verify |
| Delete ingredient | Delete and verify removal |
| Adjust stock | Use stock adjustment, verify quantity updates |
| Search and filter | Use search bar, verify filtered results |
| Group filtering | Filter by group, verify correct items shown |

### 6. Customers

| Test | What it covers |
|---|---|
| Create customer | Add customer, verify in list |
| View customer detail | Click customer, verify detail page with orders |
| Edit customer | Modify and verify |
| Delete customer | Delete and verify removal |

### 7. Payments

| Test | What it covers |
|---|---|
| Create payment | Record a payment, verify in list |
| Payment summary | Verify summary/totals are calculated correctly |
| Delete payment | Delete and verify removal |

### 8. Settings

| Test | What it covers |
|---|---|
| Update profile | Change name, verify it persists |
| Manage units | Create/edit/delete a unit |
| Manage groups | Create/edit/delete a group |
| Notification preferences | Toggle preferences, verify they persist |

### 9. i18n / RTL

| Test | What it covers |
|---|---|
| Switch to Hebrew | Change language, verify `dir="rtl"` on html and layout flips |
| Switch back to English | Change language, verify `dir="ltr"` |
| Persisted language | Reload page, verify language preference is remembered |

## CI Integration

```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: mise_test
          POSTGRES_USER: mise
          POSTGRES_PASSWORD: mise
        ports: ['5432:5432']
      redis:
        image: redis:7
        ports: ['6379:6379']
      mongo:
        image: mongo:7
        ports: ['27017:27017']

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install
      - run: pnpm --filter @mise/e2e exec playwright install --with-deps
      - run: pnpm --filter @mise/db migrate  # run migrations against mise_test
        env:
          DATABASE_URL: postgresql://mise:mise@localhost:5432/mise_test
      - run: pnpm --filter @mise/e2e test
        env:
          DATABASE_URL: postgresql://mise:mise@localhost:5432/mise_test
          NODE_ENV: test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: apps/e2e/playwright-report/
```

## Mobile / Responsive Testing

The app has two distinct layouts:
- **Desktop (lg+):** Sidebar navigation
- **Mobile (<lg):** Bottom tabs + hamburger drawer

Playwright projects should test both viewports:

```ts
projects: [
  {
    name: 'desktop-chrome',
    use: { ...devices['Desktop Chrome'] },
  },
  {
    name: 'mobile-chrome',
    use: { ...devices['Pixel 7'] },
  },
  {
    name: 'mobile-safari',
    use: { ...devices['iPhone 14'] },
  },
],
```

Mobile-specific tests:

| Test | What it covers |
|---|---|
| Bottom tabs navigation | Tap each tab, verify correct page loads |
| Hamburger drawer | Tap menu icon, verify drawer opens with all nav items |
| Drawer closes on navigate | Tap a nav item in drawer, verify it closes and page loads |
| RTL drawer direction | In Hebrew, verify drawer slides from the right (start side) |

## Navigation

| Test | What it covers |
|---|---|
| Sidebar links (desktop) | Click each sidebar link, verify correct page |
| Bottom tabs (mobile) | Tap each tab, verify correct page |
| Breadcrumbs | Navigate to a detail page, verify breadcrumbs and back navigation |
| 404 page | Visit `/nonexistent`, verify NotFoundPage renders |
| Deep link while authenticated | Direct URL to `/orders/123`, verify it loads correctly |
| Deep link while unauthenticated | Direct URL to `/orders/123`, verify redirect to login then back |

## Error Handling & Edge Cases

| Test | What it covers |
|---|---|
| API down / network error | Disconnect API, verify the app shows a meaningful error (not a blank page) |
| Empty states | New account with no data — verify empty states on orders, recipes, inventory, customers, payments |
| Form validation | Submit forms with missing required fields, verify validation messages |
| Duplicate submission | Double-click submit, verify only one record is created |
| Session expiry | Use an expired JWT, verify redirect to login |
| Concurrent tab usage | Login in one tab, verify the other tab picks up auth state |

## Test Data Seeding

Each test suite should declare what data it needs. Use a helper to seed via API calls (not direct DB inserts) so the full stack is exercised:

```ts
// fixtures/seed.ts
export async function seedOrder(request: APIRequestContext, token: string) {
  // First ensure a customer exists
  const customer = await request.post('/api/customers', {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: 'Test Customer', phone: '0501234567' },
  });
  // Then create the order
  const order = await request.post('/api/orders', {
    headers: { Authorization: `Bearer ${token}` },
    data: { customerId: customer.id, items: [...] },
  });
  return { customer, order };
}
```

Each test file should clean up after itself or rely on the global teardown truncating tables.

## Test Naming & Conventions

- File names: `<feature>.spec.ts`
- Test descriptions: `test('should <expected behavior> when <condition>')`
- Use `test.describe` to group related tests
- Use `data-testid` attributes for selectors where semantic selectors (role, label, placeholder) aren't sufficient
- Avoid selectors tied to CSS classes or DOM structure — these break on styling changes

## Local Dev Commands

```bash
# Run all e2e tests
pnpm --filter @mise/e2e test

# Run with UI mode (interactive debugging)
pnpm --filter @mise/e2e test:ui

# Run a specific test file
pnpm --filter @mise/e2e test -- tests/orders/order-crud.spec.ts

# Run only mobile tests
pnpm --filter @mise/e2e test -- --project=mobile-chrome

# View last test report
pnpm --filter @mise/e2e test:report
```

Corresponding `package.json` scripts for `apps/e2e`:

```json
{
  "scripts": {
    "test": "playwright test",
    "test:ui": "playwright test --ui",
    "test:report": "playwright show-report"
  }
}
```

## Code Examples — First Tests to Implement

### playwright.config.ts

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }]],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // Setup — runs once, creates auth state for other tests
    { name: 'setup', testMatch: /.*\.setup\.ts/, teardown: 'teardown' },
    { name: 'teardown', testMatch: /.*\.teardown\.ts/ },

    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'], storageState: 'tests/.auth/user.json' },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'], storageState: 'tests/.auth/user.json' },
      dependencies: ['setup'],
    },
  ],

  webServer: [
    {
      command: 'pnpm --filter @mise/api dev',
      port: 3001,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'pnpm --filter @mise/web dev',
      port: 5173,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
```

### fixtures/auth.fixture.ts

```ts
import { test as base, type Page } from '@playwright/test';

type Fixtures = {
  authedPage: Page;
};

export const test = base.extend<Fixtures>({
  authedPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: 'tests/.auth/user.json',
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect } from '@playwright/test';
```

### tests/auth.setup.ts — Global Auth Setup

```ts
import { test as setup, expect } from '@playwright/test';

const TEST_USER = {
  name: 'E2E Test User',
  email: `e2e-${Date.now()}@mise.test`,
  password: 'TestPass123!',
};

const TEST_STORE = {
  name: 'E2E Test Bakery',
  code: 'E2E-TEST',
};

setup('create account and store', async ({ request, page }) => {
  // 1. Register via API
  const registerRes = await request.post('http://localhost:3001/api/auth/register', {
    data: {
      name: TEST_USER.name,
      email: TEST_USER.email,
      password: TEST_USER.password,
    },
  });
  expect(registerRes.ok()).toBeTruthy();
  const { token } = await registerRes.json();

  // 2. Create store via API
  const storeRes = await request.post('http://localhost:3001/api/stores', {
    headers: { Authorization: `Bearer ${token}` },
    data: TEST_STORE,
  });
  expect(storeRes.ok()).toBeTruthy();

  // 3. Login via the UI so browser state (localStorage/cookies) is captured
  await page.goto('/login');
  await page.getByLabel('Email').fill(TEST_USER.email);
  await page.getByLabel('Password').fill(TEST_USER.password);
  await page.getByRole('button', { name: 'Login' }).click();

  // Wait for redirect to dashboard
  await page.waitForURL('/');
  await expect(page.locator('text=Dashboard')).toBeVisible();

  // 4. Save browser state for all other tests
  await page.context().storageState({ path: 'tests/.auth/user.json' });
});
```

### tests/auth/login.spec.ts

```ts
import { test, expect } from '@playwright/test';

test.describe('Login page', () => {
  test('should show login form with email and password fields', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: 'Mise' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Email').fill('wrong@email.com');
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Login' }).click();

    // Verify error toast appears
    await expect(page.getByText('Login failed')).toBeVisible({ timeout: 5000 });
  });

  test('should redirect to dashboard on successful login', async ({ page }) => {
    // Use the test user created in setup — re-login via UI
    await page.goto('/login');

    await page.getByLabel('Email').fill(process.env.E2E_USER_EMAIL!);
    await page.getByLabel('Password').fill(process.env.E2E_USER_PASSWORD!);
    await page.getByRole('button', { name: 'Login' }).click();

    await page.waitForURL('/');
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('link', { name: 'Register' }).click();

    await page.waitForURL('/register');
    await expect(page.getByLabel('Name')).toBeVisible();
  });
});
```

### tests/auth/register.spec.ts

```ts
import { test, expect } from '@playwright/test';

test.describe('Register page', () => {
  test('should register a new user and redirect to store setup', async ({ page }) => {
    await page.goto('/register');

    const uniqueEmail = `test-${Date.now()}@mise.test`;

    await page.getByLabel('Name').fill('New Baker');
    await page.getByLabel('Email').fill(uniqueEmail);
    await page.getByLabel('Password').fill('SecurePass123!');
    await page.getByRole('button', { name: 'Register' }).click();

    // New user has no store — should redirect to store setup
    await page.waitForURL('/store-setup');
    await expect(page.getByText('Set up your bakery')).toBeVisible();
  });

  test('should show error when registering with existing email', async ({ page }) => {
    await page.goto('/register');

    await page.getByLabel('Name').fill('Duplicate User');
    await page.getByLabel('Email').fill(process.env.E2E_USER_EMAIL!);
    await page.getByLabel('Password').fill('AnyPassword123!');
    await page.getByRole('button', { name: 'Register' }).click();

    await expect(page.getByText('Registration failed')).toBeVisible({ timeout: 5000 });
  });

  test('should enforce minimum password length', async ({ page }) => {
    await page.goto('/register');

    await page.getByLabel('Name').fill('Short Pass User');
    await page.getByLabel('Email').fill('shortpass@mise.test');
    await page.getByLabel('Password').fill('123');
    await page.getByRole('button', { name: 'Register' }).click();

    // HTML5 minLength=6 validation should prevent submission
    // The form should still be on /register (not navigated away)
    await expect(page).toHaveURL('/register');
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/register');

    await page.getByRole('link', { name: 'Login' }).click();

    await page.waitForURL('/login');
  });
});
```

### tests/auth/protected-routes.spec.ts

```ts
import { test, expect } from '@playwright/test';

test.describe('Protected routes', () => {
  test('should redirect unauthenticated user to login', async ({ page }) => {
    // Clear any stored auth state
    await page.context().clearCookies();
    await page.goto('/');

    await page.waitForURL('/login');
  });

  test('should redirect unauthenticated user from /orders to login', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/orders');

    await page.waitForURL('/login');
  });

  test('should show 404 page for unknown routes', async ({ page }) => {
    await page.goto('/this-does-not-exist');

    await expect(page.getByText('404')).toBeVisible();
  });
});
```

### tests/store-setup/store-setup.spec.ts

```ts
import { test, expect } from '@playwright/test';

test.describe('Store setup', () => {
  test('should create a store and redirect to dashboard', async ({ page, request }) => {
    // Register a fresh user with no store
    const email = `store-test-${Date.now()}@mise.test`;
    const password = 'TestPass123!';

    const res = await request.post('http://localhost:3001/api/auth/register', {
      data: { name: 'Store Test User', email, password },
    });
    expect(res.ok()).toBeTruthy();

    // Login via UI
    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Login' }).click();

    // Should redirect to store setup (no store yet)
    await page.waitForURL('/store-setup');

    // Fill store form
    await page.getByLabel('Store Name').fill('My Test Bakery');
    await page.getByLabel('Store Code').fill('TEST-BKR');
    await page.getByRole('button', { name: 'Create Store' }).click();

    // Should redirect to dashboard
    await page.waitForURL('/');
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });
});
```

### tests/orders/order-crud.spec.ts

```ts
import { test, expect } from '../fixtures/auth.fixture';

test.describe('Orders CRUD', () => {
  test('should show empty state when no orders exist', async ({ authedPage: page }) => {
    await page.goto('/orders');

    // Switch to list view to see empty state
    await page.getByRole('button', { name: 'List' }).or(page.locator('[class*="rounded-e"]')).click();

    await expect(page.getByText('No orders yet')).toBeVisible();
  });

  test('should navigate to new order form', async ({ authedPage: page }) => {
    await page.goto('/orders');

    await page.getByRole('button', { name: 'New Order' }).click();

    await page.waitForURL('/orders/new');
  });

  test('should toggle between pipeline and list view', async ({ authedPage: page }) => {
    await page.goto('/orders');

    // Pipeline view is default — check for status columns
    await expect(page.getByText('Received')).toBeVisible();
    await expect(page.getByText('In Progress')).toBeVisible();
    await expect(page.getByText('Ready')).toBeVisible();
    await expect(page.getByText('Delivered')).toBeVisible();
  });
});
```

### tests/inventory/inventory-crud.spec.ts

```ts
import { test, expect } from '../fixtures/auth.fixture';

test.describe('Inventory management', () => {
  test('should show inventory page with search and filters', async ({ authedPage: page }) => {
    await page.goto('/inventory');

    await expect(page.getByText('Inventory')).toBeVisible();
    await expect(page.getByPlaceholder('Search')).toBeVisible();
  });

  test('should open add ingredient modal', async ({ authedPage: page }) => {
    await page.goto('/inventory');

    // Click the "+" / add button
    await page.getByRole('button', { name: /add|new/i }).click();

    // Modal should appear with form fields
    await expect(page.getByLabel('Name')).toBeVisible();
  });

  test('should create a new ingredient', async ({ authedPage: page }) => {
    await page.goto('/inventory');

    await page.getByRole('button', { name: /add|new/i }).click();

    await page.getByLabel('Name').fill('E2E Flour');
    await page.getByLabel('Stock').fill('50');

    await page.getByRole('button', { name: 'Save' }).click();

    // Verify it appears in the list
    await expect(page.getByText('E2E Flour')).toBeVisible({ timeout: 5000 });
  });

  test('should search inventory items', async ({ authedPage: page }) => {
    await page.goto('/inventory');

    await page.getByPlaceholder('Search').fill('E2E Flour');

    // Wait for debounced search
    await page.waitForTimeout(500);

    await expect(page.getByText('E2E Flour')).toBeVisible();
  });
});
```

### tests/navigation/sidebar.spec.ts (Desktop)

```ts
import { test, expect } from '../fixtures/auth.fixture';

test.describe('Desktop sidebar navigation', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  const navItems = [
    { name: 'Dashboard', url: '/' },
    { name: 'Orders', url: '/orders' },
    { name: 'Recipes', url: '/recipes' },
    { name: 'Inventory', url: '/inventory' },
    { name: 'Customers', url: '/customers' },
    { name: 'Payments', url: '/payments' },
    { name: 'Settings', url: '/settings' },
  ];

  for (const item of navItems) {
    test(`should navigate to ${item.name}`, async ({ authedPage: page }) => {
      await page.goto('/');

      await page.getByRole('link', { name: item.name }).click();

      await expect(page).toHaveURL(item.url);
    });
  }
});
```

### tests/navigation/mobile-tabs.spec.ts (Mobile)

```ts
import { test, expect } from '../fixtures/auth.fixture';

test.describe('Mobile bottom tabs', () => {
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone-size

  test('should show bottom tabs on mobile', async ({ authedPage: page }) => {
    await page.goto('/');

    const bottomNav = page.locator('nav.fixed.bottom-0');
    await expect(bottomNav).toBeVisible();
  });

  test('should navigate via bottom tabs', async ({ authedPage: page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: 'Orders' }).click();
    await expect(page).toHaveURL('/orders');

    await page.getByRole('link', { name: 'Recipes' }).click();
    await expect(page).toHaveURL('/recipes');

    await page.getByRole('link', { name: 'Inventory' }).click();
    await expect(page).toHaveURL('/inventory');
  });
});
```

### tests/i18n/language-switch.spec.ts

```ts
import { test, expect } from '../fixtures/auth.fixture';

test.describe('Language switching', () => {
  test('should switch to Hebrew and apply RTL', async ({ authedPage: page }) => {
    await page.goto('/settings');

    // Find and click the Hebrew language option
    await page.getByText('עברית').click();

    // Verify RTL is applied
    const htmlDir = await page.locator('html').getAttribute('dir');
    expect(htmlDir).toBe('rtl');

    // Verify Hebrew text is showing
    await expect(page.getByText('לוח בקרה').or(page.getByText('הגדרות'))).toBeVisible();
  });

  test('should persist language after reload', async ({ authedPage: page }) => {
    await page.goto('/settings');

    // Switch to Hebrew
    await page.getByText('עברית').click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

    // Reload
    await page.reload();

    // Should still be Hebrew
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });
});
```

## Suggested Order of Implementation

1. **Setup** — Create `apps/e2e` package, install Playwright, write config + global setup
2. **Auth tests** — Login/register are the foundation everything else depends on
3. **Orders** — Most complex CRUD flow, good for establishing patterns
4. **Remaining CRUD** — Recipes, inventory, customers, payments (these follow the same pattern)
5. **Settings** — Lower priority, simpler forms
6. **i18n** — Quick to add once everything else works
7. **CI pipeline** — Wire it all up in GitHub Actions
