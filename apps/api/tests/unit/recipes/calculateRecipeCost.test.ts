import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CalculateRecipeCostUseCase } from '../../../src/modules/recipes/use-cases/calculateRecipeCost.js';
import { createRecipe } from '../helpers/mock-factories.js';
import { NotFoundError } from '../../../src/core/errors/app-error.js';

vi.mock('../../../src/modules/recipes/recipeCrud.js', () => ({
  RecipeCrud: {
    getById: vi.fn(),
  },
}));

vi.mock('../../../src/modules/shared/unitConversion.js', () => ({
  unitConversionFactor: vi.fn().mockReturnValue(1),
}));

import { RecipeCrud } from '../../../src/modules/recipes/recipeCrud.js';

const STORE_ID = 1;

describe('CalculateRecipeCostUseCase', () => {
  let useCase: CalculateRecipeCostUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new CalculateRecipeCostUseCase();
  });

  it('should calculate cost from direct ingredients', async () => {
    const recipe = createRecipe({
      ingredients: [
        { ingredientId: 'ing-1', name: 'Flour', quantity: 2, unit: 'kg', costPerUnit: 3.5 },
        { ingredientId: 'ing-2', name: 'Sugar', quantity: 1, unit: 'kg', costPerUnit: 5 },
      ],
      steps: [
        { order: 1, type: 'step', instruction: 'Mix' },
      ],
    });
    vi.mocked(RecipeCrud.getById).mockResolvedValue(recipe);

    const cost = await useCase.execute(STORE_ID, 'recipe-1');

    // 2 * 3.5 + 1 * 5 = 12
    expect(cost).toBe(12);
  });

  it('should calculate cost with sub-recipes', async () => {
    const parentRecipe = createRecipe({
      id: 'parent',
      ingredients: [
        { ingredientId: 'ing-1', name: 'Flour', quantity: 1, unit: 'kg', costPerUnit: 3 },
      ],
      steps: [
        { order: 1, type: 'step', instruction: 'Mix' },
        { order: 2, type: 'sub_recipe', recipeId: 'child', name: 'Frosting', quantity: 2 },
      ],
    });
    const childRecipe = createRecipe({
      id: 'child',
      ingredients: [
        { ingredientId: 'ing-2', name: 'Butter', quantity: 0.5, unit: 'kg', costPerUnit: 10 },
      ],
      steps: [
        { order: 1, type: 'step', instruction: 'Whip butter' },
      ],
    });

    vi.mocked(RecipeCrud.getById).mockImplementation(async (storeId, id) => {
      if (id === 'parent') return parentRecipe;
      if (id === 'child') return childRecipe;
      return null;
    });

    const cost = await useCase.execute(STORE_ID, 'parent');

    // Parent ingredients: 1 * 3 = 3
    // Child ingredients: 0.5 * 10 = 5, multiplied by quantity 2 = 10
    // Total: 3 + 10 = 13
    expect(cost).toBe(13);
  });

  it('should handle deeply nested sub-recipes', async () => {
    const grandparent = createRecipe({
      id: 'gp',
      ingredients: [{ ingredientId: 'i1', name: 'A', quantity: 1, unit: 'u', costPerUnit: 10 }],
      steps: [
        { order: 1, type: 'sub_recipe', recipeId: 'parent', name: 'Parent', quantity: 1 },
      ],
    });
    const parent = createRecipe({
      id: 'parent',
      ingredients: [{ ingredientId: 'i2', name: 'B', quantity: 1, unit: 'u', costPerUnit: 5 }],
      steps: [
        { order: 1, type: 'sub_recipe', recipeId: 'child', name: 'Child', quantity: 3 },
      ],
    });
    const child = createRecipe({
      id: 'child',
      ingredients: [{ ingredientId: 'i3', name: 'C', quantity: 2, unit: 'u', costPerUnit: 2 }],
      steps: [
        { order: 1, type: 'step', instruction: 'Do something' },
      ],
    });

    vi.mocked(RecipeCrud.getById).mockImplementation(async (storeId, id) => {
      if (id === 'gp') return grandparent;
      if (id === 'parent') return parent;
      if (id === 'child') return child;
      return null;
    });

    const cost = await useCase.execute(STORE_ID, 'gp');

    // gp: 1*10 = 10
    // parent: 1*5 = 5 + child: (2*2)*3 = 12 => 17
    // gp total: 10 + 17*1 = 27
    expect(cost).toBe(27);
  });

  it('should prevent circular references by returning 0 for visited recipes', async () => {
    const recipeA = createRecipe({
      id: 'a',
      ingredients: [{ ingredientId: 'i1', name: 'X', quantity: 1, unit: 'u', costPerUnit: 10 }],
      steps: [
        { order: 1, type: 'sub_recipe', recipeId: 'b', name: 'B', quantity: 1 },
      ],
    });
    const recipeB = createRecipe({
      id: 'b',
      ingredients: [{ ingredientId: 'i2', name: 'Y', quantity: 1, unit: 'u', costPerUnit: 5 }],
      steps: [
        { order: 1, type: 'sub_recipe', recipeId: 'a', name: 'A', quantity: 1 }, // circular!
      ],
    });

    vi.mocked(RecipeCrud.getById).mockImplementation(async (storeId, id) => {
      if (id === 'a') return recipeA;
      if (id === 'b') return recipeB;
      return null;
    });

    const cost = await useCase.execute(STORE_ID, 'a');

    // a: 10 + b(5 + a(0 circular)) = 15
    expect(cost).toBe(15);
  });

  it('should throw NotFoundError when recipe does not exist', async () => {
    vi.mocked(RecipeCrud.getById).mockResolvedValue(null);

    await expect(useCase.execute(STORE_ID, 'nonexistent')).rejects.toThrow(NotFoundError);
  });

  it('should handle ingredients with no costPerUnit', async () => {
    const recipe = createRecipe({
      ingredients: [
        { ingredientId: 'i1', name: 'Free item', quantity: 5, unit: 'kg', costPerUnit: undefined },
      ],
      steps: [
        { order: 1, type: 'step', instruction: 'Use it' },
      ],
    });
    vi.mocked(RecipeCrud.getById).mockResolvedValue(recipe);

    const cost = await useCase.execute(STORE_ID, 'recipe-1');
    expect(cost).toBe(0); // undefined costPerUnit treated as 0
  });

  it('should return 0 for recipe with no ingredients and no sub-recipes', async () => {
    const recipe = createRecipe({
      ingredients: [],
      steps: [],
    });
    vi.mocked(RecipeCrud.getById).mockResolvedValue(recipe);

    const cost = await useCase.execute(STORE_ID, 'recipe-1');
    expect(cost).toBe(0);
  });
});
