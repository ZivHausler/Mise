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

describe('RecipeCrud.update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update a recipe by delegating to repository', async () => {
    const updated = createRecipe({ name: 'Vanilla Cake' });
    vi.mocked(MongoRecipeRepository.update).mockResolvedValue(updated);

    const result = await RecipeCrud.update(STORE_ID, 'recipe-1', { name: 'Vanilla Cake' });

    expect(result.name).toBe('Vanilla Cake');
    expect(MongoRecipeRepository.update).toHaveBeenCalledWith(STORE_ID, 'recipe-1', { name: 'Vanilla Cake' });
  });
});
