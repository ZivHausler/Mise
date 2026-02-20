import { test, expect } from '../../fixtures/auth.fixture';

test.describe.configure({ mode: 'serial' });

/**
 * Verifies that advancing an order from In Progress → Ready deducts
 * ingredient stock, and reverting from Ready → In Progress restores it.
 *
 * Prerequisites (from earlier test files):
 *  - Flour inventory item exists with stock
 *  - Sourdough Bread recipe exists using Flour
 */

let orderDetailUrl = '';
let initialStock = 0;

test.describe('Order inventory deduction', () => {
  test('record initial stock level', async ({ page }) => {
    await page.goto('/inventory');
    const flourRow = page.locator('tr', { hasText: 'Flour' });
    const stockText = await flourRow.locator('.font-mono').first().textContent();
    initialStock = parseFloat(stockText ?? '0');
    expect(initialStock).toBeGreaterThan(0);
  });

  test('create order for deduction test', async ({ page }) => {
    await page.goto('/orders/new');

    await page.getByLabel('Customer').selectOption({ index: 1 });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.getByLabel('Due Date').fill(tomorrow.toISOString().split('T')[0]!);

    const recipeSelect = page.locator('select').filter({ hasText: 'Recipe...' });
    await recipeSelect.selectOption({ index: 1 });
    await page.getByLabel('Qty').fill('4');

    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Order created')).toBeVisible();

    // Navigate to list view and open our order (newest = first row)
    await page.locator('button:has(svg.lucide-list)').click();
    await page.locator('table tbody tr').first().click();
    await expect(page).toHaveURL(/\/orders\/.+/);
    orderDetailUrl = page.url();
  });

  test('advance to In Progress', async ({ page }) => {
    await page.goto(orderDetailUrl);
    await page.getByRole('button', { name: 'Advance' }).click();
    await expect(page.getByRole('button', { name: 'Back' })).toBeVisible();
  });

  test('advance to Ready and verify stock deducted', async ({ page }) => {
    await page.goto(orderDetailUrl);
    await page.getByRole('button', { name: 'Advance' }).click();
    // Wait for the status change to take effect
    await expect(page.getByRole('button', { name: 'Back' })).toBeVisible();

    await page.goto('/inventory');
    const flourRow = page.locator('tr', { hasText: 'Flour' });
    const stockText = await flourRow.locator('.font-mono').first().textContent();
    const currentStock = parseFloat(stockText ?? '0');

    // Stock should have decreased
    expect(currentStock).toBeLessThan(initialStock);
  });

  test('revert to In Progress and verify stock restored', async ({ page }) => {
    await page.goto(orderDetailUrl);
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByRole('button', { name: 'Advance' })).toBeVisible();

    await page.goto('/inventory');
    const flourRow = page.locator('tr', { hasText: 'Flour' });
    const stockText = await flourRow.locator('.font-mono').first().textContent();
    const restoredStock = parseFloat(stockText ?? '0');

    // Stock should be back to the initial level
    expect(restoredStock).toBeCloseTo(initialStock, 2);
  });

  test('cleanup: delete order in In Progress state', async ({ page }) => {
    await page.goto(orderDetailUrl);
    // Order is already In Progress from the previous test (non-received orders can be deleted)
    await expect(page.getByText('In Progress')).toBeVisible();

    await page.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText('Delete Order?')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText('Order deleted')).toBeVisible();
  });
});
