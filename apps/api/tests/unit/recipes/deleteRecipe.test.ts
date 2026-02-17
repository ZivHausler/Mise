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

describe('RecipeCrud.delete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete an existing recipe', async () => {
    vi.mocked(MongoRecipeRepository.findById).mockResolvedValue(createRecipe());
    vi.mocked(MongoRecipeRepository.delete).mockResolvedValue(undefined);

    await expect(RecipeCrud.delete(STORE_ID, 'recipe-1')).resolves.toBeUndefined();
    expect(MongoRecipeRepository.delete).toHaveBeenCalledWith(STORE_ID, 'recipe-1');
  });

  it('should throw NotFoundError when recipe does not exist', async () => {
    vi.mocked(MongoRecipeRepository.findById).mockResolvedValue(null);

    await expect(RecipeCrud.delete(STORE_ID, 'nonexistent')).rejects.toThrow(NotFoundError);
  });
});
