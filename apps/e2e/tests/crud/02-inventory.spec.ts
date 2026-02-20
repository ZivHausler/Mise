import { test, expect } from '../../fixtures/auth.fixture';

test.describe.configure({ mode: 'serial' });

test.describe('Inventory CRUD', () => {
  test('navigate to inventory page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Inventory' }).click();
    await expect(page).toHaveURL(/\/inventory/);
    await expect(page.getByText('No inventory items')).toBeVisible();
  });

  test('create inventory item', async ({ page }) => {
    await page.goto('/inventory');
    await page.getByRole('button', { name: 'Add Item' }).first().click();

    // Fill form
    await page.getByLabel('Name').fill('Flour');
    await page.getByLabel('Package Size').fill('25');
    await page.getByLabel('Unit').selectOption('kg');
    await page.getByLabel(/Package Price/).fill('50');

    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Item added')).toBeVisible();
    await expect(page.getByText('Flour')).toBeVisible();
  });

  test('adjust stock', async ({ page }) => {
    await page.goto('/inventory');
    await expect(page.getByText('Flour')).toBeVisible();

    // Click the adjust (sliders) button in the row
    await page.getByTitle('Adjust').click();

    // Modal opens - Type should default to "Add"
    await expect(page.getByText('Adjust: Flour')).toBeVisible();
    await page.getByLabel('Amount').fill('100');

    await page.getByRole('button', { name: 'Confirm' }).click();

    await expect(page.getByText('Stock adjusted')).toBeVisible();
  });

  test('edit inventory item', async ({ page }) => {
    await page.goto('/inventory');

    // Click the edit (pencil) button
    await page.getByTitle('Edit').click();

    await expect(page.getByText('Edit Item')).toBeVisible();

    // Change package price
    const priceField = page.getByLabel(/Package Price/);
    await priceField.clear();
    await priceField.fill('55');

    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Item updated')).toBeVisible();
  });

  test('delete inventory item', async ({ page }) => {
    await page.goto('/inventory');

    // Click the delete (trash) button
    await page.getByTitle('Delete').click();

    await expect(page.getByText('Delete Item?')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByText('Item deleted')).toBeVisible();
  });

  test('re-create inventory item for later tests', async ({ page }) => {
    await page.goto('/inventory');
    await page.getByRole('button', { name: 'Add Item' }).first().click();

    await page.getByLabel('Name').fill('Flour');
    await page.getByLabel('Package Size').fill('25');
    await page.getByLabel('Unit').selectOption('kg');
    await page.getByLabel(/Package Price/).fill('50');

    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Item added')).toBeVisible();

    // Also adjust stock so recipes can use it
    await page.getByTitle('Adjust').click();
    await page.getByLabel('Amount').fill('100');
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByText('Stock adjusted')).toBeVisible();
  });
});
