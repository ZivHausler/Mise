import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecipeCrud } from '../../../src/modules/recipes/recipeCrud.js';
import { createRecipe } from '../helpers/mock-factories.js';

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

const STORE_ID = 1;

describe('RecipeCrud.delete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete a recipe by delegating to repository', async () => {
    vi.mocked(MongoRecipeRepository.delete).mockResolvedValue(undefined);

    await expect(RecipeCrud.delete(STORE_ID, 'recipe-1')).resolves.toBeUndefined();
    expect(MongoRecipeRepository.delete).toHaveBeenCalledWith(STORE_ID, 'recipe-1');
  });
});
