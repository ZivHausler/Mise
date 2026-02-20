import { test, expect } from '../../fixtures/auth.fixture';

test.describe.configure({ mode: 'serial' });

test.describe('Recipes CRUD', () => {
  test('navigate to recipes page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Recipes' }).click();
    await expect(page).toHaveURL(/\/recipes/);
    await expect(page.getByText('No recipes yet')).toBeVisible();
  });

  test('create recipe', async ({ page }) => {
    await page.goto('/recipes');
    await page.getByRole('button', { name: 'New Recipe' }).first().click();

    await expect(page).toHaveURL(/\/recipes\/new/);

    // Basic info
    await page.getByLabel('Name').fill('Sourdough Bread');
    await page.getByLabel('Category').selectOption('breads');
    await page.getByLabel(/Selling Price/).fill('25');

    // Add ingredient — select Flour from the dropdown
    const ingredientsSection = page.getByRole('heading', { name: 'Ingredients' }).locator('..');
    await ingredientsSection.locator('select').first().selectOption({ label: 'Flour' });

    // Set quantity
    await ingredientsSection.getByRole('textbox', { name: 'Qty' }).first().fill('0.5');

    // Add a step with instruction
    await page.getByRole('heading', { name: 'Steps' }).locator('..').locator('textarea').first().fill('Mix flour with water and let rest');

    // Save
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Recipe created')).toBeVisible();
    await expect(page).toHaveURL(/\/recipes$/);
  });

  test('view recipe detail', async ({ page }) => {
    await page.goto('/recipes');
    await page.getByText('Sourdough Bread').click();

    await expect(page).toHaveURL(/\/recipes\/.+/);
    await expect(page.getByRole('heading', { name: 'Sourdough Bread' })).toBeVisible();
    // Verify category
    await expect(page.getByText('breads').first()).toBeVisible();
    // Verify ingredient in Ingredients tab
    await expect(page.getByText('Flour')).toBeVisible();
  });

  test('edit recipe', async ({ page }) => {
    await page.goto('/recipes');
    await page.getByText('Sourdough Bread').click();
    await expect(page).toHaveURL(/\/recipes\/.+/);

    await page.getByRole('button', { name: 'Edit' }).click();
    await expect(page).toHaveURL(/\/recipes\/.+\/edit/);

    // Change selling price
    const priceField = page.getByLabel(/Selling Price/);
    await priceField.clear();
    await priceField.fill('30');

    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Recipe updated')).toBeVisible();
  });

  test('delete recipe', async ({ page }) => {
    await page.goto('/recipes');
    await page.getByText('Sourdough Bread').click();
    await expect(page).toHaveURL(/\/recipes\/.+/);

    await page.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByText('Delete Recipe?')).toBeVisible();
    // Click the confirm Delete button in the modal
    await page.getByRole('button', { name: 'Delete' }).nth(1).click();

    await expect(page.getByText('Recipe deleted')).toBeVisible();
    await expect(page).toHaveURL(/\/recipes$/);
  });

  test('re-create recipe for later tests', async ({ page }) => {
    await page.goto('/recipes/new');

    await page.getByLabel('Name').fill('Sourdough Bread');
    await page.getByLabel('Category').selectOption('breads');
    await page.getByLabel(/Selling Price/).fill('25');

    // Add ingredient
    const ingredientsSection = page.getByText('Ingredients').locator('..');
    await ingredientsSection.locator('select').first().selectOption({ label: 'Flour' });
    await ingredientsSection.getByRole('textbox', { name: 'Qty' }).first().fill('0.5');

    // Add step
    await page.getByRole('heading', { name: 'Steps' }).locator('..').locator('textarea').first().fill('Mix flour with water');

    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Recipe created')).toBeVisible();
  });
});
