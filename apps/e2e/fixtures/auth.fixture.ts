import { test as base, type Page } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Dismiss the React Joyride onboarding tour if it appears.
 * Clicks "Skip" then waits for the overlay to disappear.
 */
async function dismissTourIfPresent(page: Page) {
  // Check if the tour tooltip is visible (it contains a Skip button)
  const skipButton = page.locator('button', { hasText: 'Skip' });
  const tourVisible = await skipButton.isVisible({ timeout: 2_000 }).catch(() => false);
  if (!tourVisible) return;

  await skipButton.click();
  // Wait for the tour overlay to disappear
  await page.locator('.react-joyride__overlay').waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
  // Small pause for React to settle
  await page.waitForTimeout(300);
}

export const test = base.extend({
  storageState: resolve(__dirname, '../tests/.auth/user.json'),
  page: async ({ page }, use) => {
    // Wrap goto to auto-dismiss tour after each navigation
    const originalGoto = page.goto.bind(page);
    page.goto = async (url, options) => {
      const result = await originalGoto(url, options);
      await dismissTourIfPresent(page);
      return result;
    };
    await use(page);
  },
});

export { expect } from '@playwright/test';
