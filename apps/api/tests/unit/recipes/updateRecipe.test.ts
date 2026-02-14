import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateRecipeUseCase } from '../../../src/modules/recipes/use-cases/updateRecipe.js';
import { createMockRecipeRepository, createRecipe } from '../helpers/mock-factories.js';
import { NotFoundError } from '../../../src/core/errors/app-error.js';
import type { IRecipeRepository } from '../../../src/modules/recipes/recipe.repository.js';

describe('UpdateRecipeUseCase', () => {
  let useCase: UpdateRecipeUseCase;
  let repo: IRecipeRepository;

  beforeEach(() => {
    repo = createMockRecipeRepository();
    useCase = new UpdateRecipeUseCase(repo);
  });

  it('should update an existing recipe', async () => {
    const existing = createRecipe();
    const updated = createRecipe({ name: 'Vanilla Cake' });
    vi.mocked(repo.findById).mockResolvedValue(existing);
    vi.mocked(repo.update).mockResolvedValue(updated);

    const result = await useCase.execute('recipe-1', { name: 'Vanilla Cake' });

    expect(result.name).toBe('Vanilla Cake');
    expect(repo.update).toHaveBeenCalledWith('recipe-1', { name: 'Vanilla Cake' });
  });

  it('should throw NotFoundError when recipe does not exist', async () => {
    vi.mocked(repo.findById).mockResolvedValue(null);

    await expect(
      useCase.execute('nonexistent', { name: 'X' }),
    ).rejects.toThrow(NotFoundError);
    await expect(
      useCase.execute('nonexistent', { name: 'X' }),
    ).rejects.toThrow('Recipe not found');
  });
});
