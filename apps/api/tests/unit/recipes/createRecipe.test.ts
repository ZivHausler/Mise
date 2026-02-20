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

const STORE_ID = 'store-1';

describe('RecipeCrud.create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a recipe with valid data', async () => {
    const recipe = createRecipe();
    vi.mocked(MongoRecipeRepository.create).mockResolvedValue(recipe);

    const result = await RecipeCrud.create(STORE_ID, {
      name: 'Chocolate Cake',
      ingredients: [{ ingredientId: 'ing-1', quantity: 2, unit: 'kg' }],
      steps: [{ order: 1, type: 'step', instruction: 'Mix ingredients' }],
    });

    expect(result).toEqual(recipe);
    expect(MongoRecipeRepository.create).toHaveBeenCalledOnce();
  });

  it('should create recipe with optional fields', async () => {
    const recipe = createRecipe({
      description: 'Delicious cake',
      category: 'cakes',
      tags: ['chocolate', 'birthday'],
      yield: 12,
      yieldUnit: 'slices',
      sellingPrice: 120,
    });
    vi.mocked(MongoRecipeRepository.create).mockResolvedValue(recipe);

    const result = await RecipeCrud.create(STORE_ID, {
      name: 'Chocolate Cake',
      description: 'Delicious cake',
      category: 'cakes',
      tags: ['chocolate', 'birthday'],
      ingredients: [{ ingredientId: 'ing-1', quantity: 2, unit: 'kg' }],
      steps: [{ order: 1, type: 'step', instruction: 'Mix' }],
      yield: 12,
      yieldUnit: 'slices',
      sellingPrice: 120,
    });

    expect(result.category).toBe('cakes');
    expect(result.tags).toEqual(['chocolate', 'birthday']);
  });
});
