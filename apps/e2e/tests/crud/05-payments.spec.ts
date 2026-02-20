import { test, expect } from '../../fixtures/auth.fixture';

test.describe.configure({ mode: 'serial' });

test.describe('Payments CRUD', () => {
  test('navigate to payments page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Payments' }).click();
    await expect(page).toHaveURL(/\/payments/);
    await expect(page.getByText('No payments yet')).toBeVisible();
  });

  test('log payment', async ({ page }) => {
    await page.goto('/payments');
    await page.getByRole('button', { name: 'Log Payment' }).first().click();

    // Modal opens
    await expect(page.getByRole('heading', { name: 'Log Payment' })).toBeVisible();

    // Wait for order options to load, then select the first one
    const orderSelect = page.getByLabel('Order');
    await expect(orderSelect.locator('option')).toHaveCount(2, { timeout: 10_000 }); // placeholder + 1 order
    await orderSelect.selectOption({ index: 1 });

    // Select method Cash
    await page.getByLabel('Method').selectOption('cash');

    // Click Log Payment button in modal footer
    await page.getByRole('dialog').getByRole('button', { name: 'Log Payment' }).click();

    await expect(page.getByText('Payment logged')).toBeVisible();
  });

  test('verify payment in table', async ({ page }) => {
    await page.goto('/payments');

    // Check payment row shows correct method
    await expect(page.getByText('Cash')).toBeVisible();
    // Check status is Completed
    await expect(page.getByText('Completed')).toBeVisible();
    // Check customer name
    await expect(page.getByText('E2E Baker')).toBeVisible();
  });

  test('refund payment', async ({ page }) => {
    await page.goto('/payments');

    // Click Refund button on the payment row
    await page.getByRole('button', { name: 'Refund' }).click();

    // Confirm in modal
    await expect(page.getByText('Refund Payment?')).toBeVisible();
    await page.getByRole('button', { name: 'Refund' }).nth(1).click();

    await expect(page.getByText('Payment refunded')).toBeVisible();
    // Verify status changed to Refunded
    await expect(page.getByText('Refunded', { exact: true }).first()).toBeVisible();
  });
});
