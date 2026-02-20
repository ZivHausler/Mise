import { test, expect } from '../../fixtures/auth.fixture';

test.describe.configure({ mode: 'serial' });

test.describe('Orders CRUD', () => {
  test('navigate to orders page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Orders' }).click();
    await expect(page).toHaveURL(/\/orders/);
    // Pipeline view shows "No results found" in empty columns
    await expect(page.getByText('No results found').first()).toBeVisible();
  });

  test('create order', async ({ page }) => {
    await page.goto('/orders');
    await page.getByRole('button', { name: 'New Order' }).first().click();

    await expect(page).toHaveURL(/\/orders\/new/);

    // Select customer
    await page.getByLabel('Customer').selectOption({ label: 'E2E Baker' });

    // Set due date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dueDateStr = tomorrow.toISOString().split('T')[0];
    await page.getByLabel('Due Date').fill(dueDateStr!);

    // Select recipe in the first item row
    const recipeSelect = page.locator('select').filter({ hasText: 'Recipe...' });
    await recipeSelect.selectOption({ label: 'Sourdough Bread' });

    // Set quantity
    await page.getByLabel('Qty').fill('2');

    // Save
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Order created')).toBeVisible();
    await expect(page).toHaveURL(/\/orders$/);
  });

  test('view order detail', async ({ page }) => {
    await page.goto('/orders');

    // Switch to list view for easier clicking
    await page.locator('button:has(svg.lucide-list)').click();

    // Click on the order row
    await page.getByText('E2E Baker').click();

    await expect(page).toHaveURL(/\/orders\/.+/);
    // Verify customer name in details
    await expect(page.getByText('E2E Baker')).toBeVisible();
    // Verify recipe item
    await expect(page.getByText('Sourdough Bread')).toBeVisible();
  });

  test('advance order status', async ({ page }) => {
    await page.goto('/orders');

    // Switch to list view
    await page.locator('button:has(svg.lucide-list)').click();

    // Click on the order
    await page.getByText('E2E Baker').click();
    await expect(page).toHaveURL(/\/orders\/.+/);

    // Verify initial status is Received
    await expect(page.getByText('Received')).toBeVisible();

    // Click Advance button
    await page.getByRole('button', { name: 'Advance' }).click();

    // Verify status changed to In Progress
    await expect(page.getByText('In Progress')).toBeVisible();
  });

  test('delete order', async ({ page }) => {
    await page.goto('/orders');

    // Switch to list view
    await page.locator('button:has(svg.lucide-list)').click();

    await page.getByText('E2E Baker').click();
    await expect(page).toHaveURL(/\/orders\/.+/);

    // Order should still be In Progress from the previous test (non-received orders can be deleted)
    await expect(page.getByText('In Progress')).toBeVisible();

    await page.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByText('Delete Order?')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByText('Order deleted')).toBeVisible();
    await expect(page).toHaveURL(/\/orders$/);
  });

  test('re-create order for payments tests', async ({ page }) => {
    await page.goto('/orders/new');

    await page.getByLabel('Customer').selectOption({ label: 'E2E Baker' });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.getByLabel('Due Date').fill(tomorrow.toISOString().split('T')[0]!);

    const recipeSelect = page.locator('select').filter({ hasText: 'Recipe...' });
    await recipeSelect.selectOption({ label: 'Sourdough Bread' });
    await page.getByLabel('Qty').fill('2');

    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Order created')).toBeVisible();
  });
});
