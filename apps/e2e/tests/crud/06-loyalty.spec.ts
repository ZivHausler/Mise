import { test, expect } from '../../fixtures/auth.fixture';

test.describe.configure({ mode: 'serial' });

test.describe('Loyalty System', () => {
  test('enable loyalty program in settings', async ({ page }) => {
    await page.goto('/settings');

    // After the tour is dismissed (by fixture), we may be on `/` if the tour redirected.
    // Navigate to settings if needed.
    if (!page.url().includes('/settings')) {
      await page.goto('/settings');
    }

    // Click the Loyalty tab button
    await page.getByRole('button', { name: 'Loyalty' }).click();

    // Enable the program toggle
    const toggle = page.getByLabel('Enable Program').or(page.getByLabel(/enable/i));
    if (!(await toggle.isChecked())) {
      await toggle.check();
    }

    // Save settings
    await page.getByRole('button', { name: /save/i }).click();

    await expect(page.getByText('Loyalty settings updated')).toBeVisible();
  });

  test('navigate to customer detail and see loyalty tab', async ({ page }) => {
    await page.goto('/customers');

    // Create customer if it doesn't exist (when running this spec standalone)
    const hasCustomer = await page.getByText('E2E Baker').isVisible({ timeout: 2_000 }).catch(() => false);
    if (!hasCustomer) {
      await page.getByRole('button', { name: 'New Customer' }).first().click();
      await page.getByLabel('Name').fill('E2E Baker');
      await page.getByLabel('Phone').fill('0541234567');
      await page.getByLabel('Email').fill('e2e-baker@test.local');
      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('Customer created')).toBeVisible();
    }

    // Click on the customer
    await page.getByText('E2E Baker').click();
    await expect(page).toHaveURL(/\/customers\/.+/);

    // Loyalty tab should be visible since program is active
    const loyaltyTab = page.getByText('Loyalty', { exact: true });
    await expect(loyaltyTab).toBeVisible();
  });

  test('adjust points for customer', async ({ page }) => {
    await page.goto('/customers');
    await page.getByText('E2E Baker').click();
    await expect(page).toHaveURL(/\/customers\/.+/);

    // Switch to loyalty tab
    await page.getByText('Loyalty', { exact: true }).click();

    // Click Adjust Points button
    await page.getByRole('button', { name: /adjust/i }).click();

    // Modal opens
    await expect(page.getByText('Adjust Loyalty Points')).toBeVisible();

    // Enter points (use spinbutton role to target the input, not the dialog)
    await page.getByRole('spinbutton', { name: 'Points' }).fill('100');

    // Submit
    await page.getByRole('dialog').getByRole('button', { name: /adjust|save|confirm/i }).click();

    await expect(page.getByText('Points adjusted')).toBeVisible();
  });

  test('verify points balance after adjustment', async ({ page }) => {
    await page.goto('/customers');
    await page.getByText('E2E Baker').click();
    await page.getByText('Loyalty', { exact: true }).click();

    // Balance card should show 100 (use the bold heading element)
    await expect(page.locator('.text-h2').getByText('100')).toBeVisible();
  });

  test('redeem points for customer', async ({ page }) => {
    await page.goto('/customers');
    await page.getByText('E2E Baker').click();
    await page.getByText('Loyalty', { exact: true }).click();

    // Click Redeem Points button
    await page.getByRole('button', { name: /redeem/i }).click();

    // Modal opens
    await expect(page.getByText('Redeem Loyalty Points')).toBeVisible();

    // Enter points to redeem (use spinbutton role to target the input)
    await page.getByRole('spinbutton').fill('50');

    // Submit
    await page.getByRole('dialog').getByRole('button', { name: /redeem|confirm/i }).click();

    await expect(page.getByText('Points redeemed')).toBeVisible();
  });

  test('verify balance decreased after redemption', async ({ page }) => {
    await page.goto('/customers');
    await page.getByText('E2E Baker').click();
    await page.getByText('Loyalty', { exact: true }).click();

    // Balance should now be 50 (100 - 50) — target the primary-colored balance card
    await expect(page.locator('.text-h2.text-primary-700').getByText('50')).toBeVisible();
  });

  test('verify transaction history shows entries', async ({ page }) => {
    await page.goto('/customers');
    await page.getByText('E2E Baker').click();
    await page.getByText('Loyalty', { exact: true }).click();

    // Should see transaction type badges
    await expect(page.getByText('Adjusted', { exact: true })).toBeVisible();
    await expect(page.getByText('Redeemed', { exact: true })).toBeVisible();
  });

  test('update loyalty config values', async ({ page }) => {
    await page.goto('/settings');

    if (!page.url().includes('/settings')) {
      await page.goto('/settings');
    }

    await page.getByRole('button', { name: 'Loyalty' }).click();

    // Update points per shekel
    const pointsPerShekel = page.getByLabel(/points per/i);
    await pointsPerShekel.clear();
    await pointsPerShekel.fill('2');

    // Save
    await page.getByRole('button', { name: /save/i }).click();
    await expect(page.getByText('Loyalty settings updated')).toBeVisible();
  });
});
