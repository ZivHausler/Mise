import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecipeService } from '../../../src/modules/recipes/recipe.service.js';
import { createRecipe } from '../helpers/mock-factories.js';
import { NotFoundError, ValidationError } from '../../../src/core/errors/app-error.js';

vi.mock('../../../src/core/events/event-bus.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../src/core/events/event-bus.js')>();
  return { ...original, getEventBus: vi.fn().mockReturnValue({ publish: vi.fn().mockResolvedValue(undefined), subscribe: vi.fn() }) };
});

let mockCalculateCostResult = 0;

vi.mock('../../../src/modules/recipes/use-cases/calculateRecipeCost.js', () => ({
  CalculateRecipeCostUseCase: class {
    async execute() { return mockCalculateCostResult; }
  },
}));

vi.mock('../../../src/modules/recipes/recipeCrud.js', () => ({
  RecipeCrud: {
    create: vi.fn(),
    getById: vi.fn(),
    getAll: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../../src/modules/orders/orderCrud.js', () => ({
  OrderCrud: {
    countActiveByRecipe: vi.fn().mockResolvedValue(0),
  },
}));

vi.mock('../../../src/modules/shared/unitConversion.js', () => ({
  unitConversionFactor: vi.fn().mockReturnValue(1),
}));

vi.mock('../../../src/core/storage/gcs.js', () => ({
  deleteRecipeImages: vi.fn().mockResolvedValue(undefined),
  movePhotosToRecipe: vi.fn(),
  deleteImage: vi.fn(),
  isTempUrl: vi.fn(),
}));

import { RecipeCrud } from '../../../src/modules/recipes/recipeCrud.js';

const STORE_ID = 1;

describe('RecipeService', () => {
  let service: RecipeService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCalculateCostResult = 0;
    service = new RecipeService();
  });

  describe('getById', () => {
    it('should return recipe when found', async () => {
      const recipe = createRecipe();
      vi.mocked(RecipeCrud.getById).mockResolvedValue(recipe);

      const result = await service.getById(STORE_ID, 'recipe-1');
      expect(result).toEqual(recipe);
    });

    it('should throw NotFoundError when recipe not found', async () => {
      vi.mocked(RecipeCrud.getById).mockResolvedValue(null);

      await expect(service.getById(STORE_ID, 'nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getAll', () => {
    it('should return all recipes', async () => {
      const recipes = [createRecipe({ id: 'r1' }), createRecipe({ id: 'r2' })];
      vi.mocked(RecipeCrud.getAll).mockResolvedValue(recipes);

      const result = await service.getAll(STORE_ID);
      expect(result).toHaveLength(2);
    });

    it('should pass filters', async () => {
      vi.mocked(RecipeCrud.getAll).mockResolvedValue([]);

      await service.getAll(STORE_ID, { category: 'cakes', search: 'choco' });
      expect(RecipeCrud.getAll).toHaveBeenCalledWith(STORE_ID, { category: 'cakes', search: 'choco' });
    });
  });

  describe('create', () => {
    it('should create a recipe and calculate cost', async () => {
      const recipe = createRecipe();
      vi.mocked(RecipeCrud.create).mockResolvedValue(recipe);
      vi.mocked(RecipeCrud.update).mockResolvedValue(recipe);
      vi.mocked(RecipeCrud.getById).mockResolvedValue(recipe);
      mockCalculateCostResult = 12;

      const result = await service.create(STORE_ID, {
        name: 'Chocolate Cake',
        ingredients: [{ ingredientId: 'ing-1', quantity: 2, unit: 'kg' }],
        steps: [{ order: 1, type: 'step', instruction: 'Mix' }],
      });

      expect(result).toEqual(recipe);
      expect(RecipeCrud.create).toHaveBeenCalledOnce();
    });
  });

  describe('update', () => {
    it('should update an existing recipe', async () => {
      const recipe = createRecipe();
      vi.mocked(RecipeCrud.getById).mockResolvedValue(recipe);
      vi.mocked(RecipeCrud.update).mockResolvedValue({ ...recipe, name: 'Updated' });
      mockCalculateCostResult = 15;

      const result = await service.update(STORE_ID, 'recipe-1', { name: 'Updated' });
      expect(result).toBeDefined();
    });

    it('should throw NotFoundError when recipe not found', async () => {
      vi.mocked(RecipeCrud.getById).mockResolvedValue(null);

      await expect(service.update(STORE_ID, 'nonexistent', { name: 'x' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('calculateCost', () => {
    it('should calculate and persist cost', async () => {
      const recipe = createRecipe({ yield: 10 });
      vi.mocked(RecipeCrud.getById).mockResolvedValue(recipe);
      vi.mocked(RecipeCrud.update).mockResolvedValue(recipe);
      mockCalculateCostResult = 50;

      const result = await service.calculateCost(STORE_ID, 'recipe-1');
      expect(result.totalCost).toBe(50);
      expect(result.costPerUnit).toBe(5);
    });

    it('should set costPerUnit equal to totalCost when no yield', async () => {
      const recipe = createRecipe({ yield: undefined });
      vi.mocked(RecipeCrud.getById).mockResolvedValue(recipe);
      vi.mocked(RecipeCrud.update).mockResolvedValue(recipe);
      mockCalculateCostResult = 30;

      const result = await service.calculateCost(STORE_ID, 'recipe-1');
      expect(result.totalCost).toBe(30);
      expect(result.costPerUnit).toBe(30);
    });
  });

  describe('circular sub-recipe detection', () => {
    it('should reject self-referencing sub-recipe on update', async () => {
      const recipe = createRecipe({ id: 'recipe-1' });
      vi.mocked(RecipeCrud.getById).mockResolvedValue(recipe);

      await expect(
        service.update(STORE_ID, 'recipe-1', {
          steps: [{ order: 1, type: 'sub_recipe', recipeId: 'recipe-1', quantity: 1 }],
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('should reject indirect circular reference (A -> B -> A)', async () => {
      const recipeA = createRecipe({
        id: 'a',
        steps: [{ order: 1, type: 'step', instruction: 'Mix' }],
      });
      const recipeB = createRecipe({
        id: 'b',
        steps: [{ order: 1, type: 'sub_recipe', recipeId: 'a', name: 'A', quantity: 1 }],
      });

      vi.mocked(RecipeCrud.getById).mockImplementation(async (_storeId, id) => {
        if (id === 'a') return recipeA;
        if (id === 'b') return recipeB;
        return null;
      });

      // Updating recipe A to include B as sub-recipe should fail because B -> A
      await expect(
        service.update(STORE_ID, 'a', {
          steps: [{ order: 1, type: 'sub_recipe', recipeId: 'b', quantity: 1 }],
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('should reject deep circular reference (A -> B -> C -> A)', async () => {
      const recipeA = createRecipe({ id: 'a', steps: [] });
      const recipeB = createRecipe({
        id: 'b',
        steps: [{ order: 1, type: 'sub_recipe', recipeId: 'c', name: 'C', quantity: 1 }],
      });
      const recipeC = createRecipe({
        id: 'c',
        steps: [{ order: 1, type: 'sub_recipe', recipeId: 'a', name: 'A', quantity: 1 }],
      });

      vi.mocked(RecipeCrud.getById).mockImplementation(async (_storeId, id) => {
        if (id === 'a') return recipeA;
        if (id === 'b') return recipeB;
        if (id === 'c') return recipeC;
        return null;
      });

      await expect(
        service.update(STORE_ID, 'a', {
          steps: [{ order: 1, type: 'sub_recipe', recipeId: 'b', quantity: 1 }],
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('should allow valid non-circular sub-recipe references', async () => {
      const recipeA = createRecipe({ id: 'a', steps: [] });
      const recipeB = createRecipe({
        id: 'b',
        steps: [{ order: 1, type: 'step', instruction: 'Whip' }],
      });

      vi.mocked(RecipeCrud.getById).mockImplementation(async (_storeId, id) => {
        if (id === 'a') return recipeA;
        if (id === 'b') return recipeB;
        return null;
      });
      vi.mocked(RecipeCrud.update).mockResolvedValue({ ...recipeA, steps: [{ order: 1, type: 'sub_recipe' as const, recipeId: 'b', name: 'B', quantity: 1 }] });

      await expect(
        service.update(STORE_ID, 'a', {
          steps: [{ order: 1, type: 'sub_recipe', recipeId: 'b', quantity: 1 }],
        }),
      ).resolves.toBeDefined();
    });
  });

  describe('delete', () => {
    it('should delete an existing recipe', async () => {
      vi.mocked(RecipeCrud.getById).mockResolvedValue(createRecipe());
      vi.mocked(RecipeCrud.delete).mockResolvedValue(undefined);

      await expect(service.delete(STORE_ID, 'recipe-1')).resolves.toBeUndefined();
    });

    it('should throw NotFoundError when recipe not found', async () => {
      vi.mocked(RecipeCrud.getById).mockResolvedValue(null);

      await expect(service.delete(STORE_ID, 'nonexistent')).rejects.toThrow(NotFoundError);
    });
  });
});
