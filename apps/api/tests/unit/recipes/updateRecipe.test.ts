import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecipeCrud } from '../../../src/modules/recipes/crud/recipeCrud.js';
import { createRecipe } from '../helpers/mock-factories.js';
import { NotFoundError } from '../../../src/core/errors/app-error.js';

vi.mock('../../../src/modules/recipes/recipe.repository.js', () => ({
  MongoRecipeRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { MongoRecipeRepository } from '../../../src/modules/recipes/recipe.repository.js';

const STORE_ID = 'store-1';

describe('RecipeCrud.update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update an existing recipe', async () => {
    const existing = createRecipe();
    const updated = createRecipe({ name: 'Vanilla Cake' });
    vi.mocked(MongoRecipeRepository.findById).mockResolvedValue(existing);
    vi.mocked(MongoRecipeRepository.update).mockResolvedValue(updated);

    const result = await RecipeCrud.update(STORE_ID, 'recipe-1', { name: 'Vanilla Cake' });

    expect(result.name).toBe('Vanilla Cake');
    expect(MongoRecipeRepository.update).toHaveBeenCalledWith(STORE_ID, 'recipe-1', { name: 'Vanilla Cake' });
  });

  it('should throw NotFoundError when recipe does not exist', async () => {
    vi.mocked(MongoRecipeRepository.findById).mockResolvedValue(null);

    await expect(
      RecipeCrud.update(STORE_ID, 'nonexistent', { name: 'X' }),
    ).rejects.toThrow(NotFoundError);
    await expect(
      RecipeCrud.update(STORE_ID, 'nonexistent', { name: 'X' }),
    ).rejects.toThrow('Recipe not found');
  });
});
