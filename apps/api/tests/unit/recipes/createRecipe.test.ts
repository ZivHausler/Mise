import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateRecipeUseCase } from '../../../src/modules/recipes/use-cases/createRecipe.js';
import { createMockRecipeRepository, createRecipe } from '../helpers/mock-factories.js';
import { ValidationError } from '../../../src/core/errors/app-error.js';
import type { IRecipeRepository } from '../../../src/modules/recipes/recipe.repository.js';

describe('CreateRecipeUseCase', () => {
  let useCase: CreateRecipeUseCase;
  let repo: IRecipeRepository;

  beforeEach(() => {
    repo = createMockRecipeRepository();
    useCase = new CreateRecipeUseCase(repo);
  });

  it('should create a recipe with valid data', async () => {
    const recipe = createRecipe();
    vi.mocked(repo.create).mockResolvedValue(recipe);

    const result = await useCase.execute({
      name: 'Chocolate Cake',
      ingredients: [{ ingredientId: 'ing-1', quantity: 2, unit: 'kg' }],
      steps: [{ order: 1, instruction: 'Mix ingredients' }],
    });

    expect(result).toEqual(recipe);
    expect(repo.create).toHaveBeenCalledOnce();
  });

  it('should throw ValidationError when name is empty', async () => {
    await expect(
      useCase.execute({
        name: '',
        ingredients: [],
        steps: [{ order: 1, instruction: 'Do something' }],
      }),
    ).rejects.toThrow('Recipe name is required');
  });

  it('should throw ValidationError when name is whitespace only', async () => {
    await expect(
      useCase.execute({
        name: '   ',
        ingredients: [],
        steps: [{ order: 1, instruction: 'Do something' }],
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError when no steps provided', async () => {
    await expect(
      useCase.execute({
        name: 'Test',
        ingredients: [],
        steps: [],
      }),
    ).rejects.toThrow('At least one step is required');
  });

  it('should throw ValidationError when a step has empty instruction', async () => {
    await expect(
      useCase.execute({
        name: 'Test',
        ingredients: [],
        steps: [
          { order: 1, instruction: 'Good step' },
          { order: 2, instruction: '' },
        ],
      }),
    ).rejects.toThrow('Step 2 must have an instruction');
  });

  it('should throw ValidationError when a step instruction is whitespace', async () => {
    await expect(
      useCase.execute({
        name: 'Test',
        ingredients: [],
        steps: [{ order: 1, instruction: '   ' }],
      }),
    ).rejects.toThrow('Step 1 must have an instruction');
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
    vi.mocked(repo.create).mockResolvedValue(recipe);

    const result = await useCase.execute({
      name: 'Chocolate Cake',
      description: 'Delicious cake',
      category: 'cakes',
      tags: ['chocolate', 'birthday'],
      ingredients: [{ ingredientId: 'ing-1', quantity: 2, unit: 'kg' }],
      steps: [{ order: 1, instruction: 'Mix' }],
      yield: 12,
      yieldUnit: 'slices',
      sellingPrice: 120,
    });

    expect(result.category).toBe('cakes');
    expect(result.tags).toEqual(['chocolate', 'birthday']);
  });
});
