import { test, expect } from '../../fixtures/auth.fixture';

test.describe.configure({ mode: 'serial' });

test.describe('Customers CRUD', () => {
  test('navigate to customers page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Customers' }).click();
    await expect(page).toHaveURL(/\/customers/);
    await expect(page.getByText('No customers yet')).toBeVisible();
  });

  test('create customer', async ({ page }) => {
    await page.goto('/customers');
    await page.getByRole('button', { name: 'New Customer' }).first().click();

    // Fill form
    await page.getByLabel('Name').fill('E2E Baker');
    await page.getByLabel('Phone').fill('0541234567');
    await page.getByLabel('Email').fill('e2e-baker@test.local');

    await page.getByRole('button', { name: 'Save' }).click();

    // Verify toast and customer in table
    await expect(page.getByText('Customer created')).toBeVisible();
    await expect(page.getByText('E2E Baker')).toBeVisible();
  });

  test('view customer detail', async ({ page }) => {
    await page.goto('/customers');
    await page.getByText('E2E Baker').click();

    await expect(page).toHaveURL(/\/customers\/.+/);
    await expect(page.getByRole('heading', { name: 'E2E Baker' })).toBeVisible();
    await expect(page.getByText('0541234567')).toBeVisible();
    await expect(page.getByText('e2e-baker@test.local')).toBeVisible();
  });

  test('delete customer', async ({ page }) => {
    await page.goto('/customers');
    await page.getByText('E2E Baker').click();
    await expect(page).toHaveURL(/\/customers\/.+/);

    await page.getByRole('button', { name: 'Delete' }).click();

    // Confirm in modal
    await expect(page.getByText('Delete Customer?')).toBeVisible();
    await page.getByRole('button', { name: 'Delete' }).nth(1).click();

    await expect(page.getByText('Customer deleted')).toBeVisible();
    await expect(page).toHaveURL(/\/customers$/);
  });

  test('re-create customer for later tests', async ({ page }) => {
    await page.goto('/customers');
    await page.getByRole('button', { name: 'New Customer' }).first().click();

    await page.getByLabel('Name').fill('E2E Baker');
    await page.getByLabel('Phone').fill('0541234567');
    await page.getByLabel('Email').fill('e2e-baker@test.local');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Customer created')).toBeVisible();
    await expect(page.getByText('E2E Baker')).toBeVisible();
  });
});
