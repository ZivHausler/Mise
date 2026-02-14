import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteRecipeUseCase } from '../../../src/modules/recipes/use-cases/deleteRecipe.js';
import { createMockRecipeRepository, createRecipe } from '../helpers/mock-factories.js';
import { NotFoundError } from '../../../src/core/errors/app-error.js';
import type { IRecipeRepository } from '../../../src/modules/recipes/recipe.repository.js';

describe('DeleteRecipeUseCase', () => {
  let useCase: DeleteRecipeUseCase;
  let repo: IRecipeRepository;

  beforeEach(() => {
    repo = createMockRecipeRepository();
    useCase = new DeleteRecipeUseCase(repo);
  });

  it('should delete an existing recipe', async () => {
    vi.mocked(repo.findById).mockResolvedValue(createRecipe());
    vi.mocked(repo.delete).mockResolvedValue(undefined);

    await expect(useCase.execute('recipe-1')).resolves.toBeUndefined();
    expect(repo.delete).toHaveBeenCalledWith('recipe-1');
  });

  it('should throw NotFoundError when recipe does not exist', async () => {
    vi.mocked(repo.findById).mockResolvedValue(null);

    await expect(useCase.execute('nonexistent')).rejects.toThrow(NotFoundError);
  });
});
