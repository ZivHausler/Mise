import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteIngredientUseCase } from '../../../src/modules/inventory/use-cases/deleteIngredient.js';
import { createMockInventoryRepository, createIngredient } from '../helpers/mock-factories.js';
import { NotFoundError } from '../../../src/core/errors/app-error.js';
import type { IInventoryRepository } from '../../../src/modules/inventory/inventory.repository.js';

describe('DeleteIngredientUseCase', () => {
  let useCase: DeleteIngredientUseCase;
  let repo: IInventoryRepository;

  beforeEach(() => {
    repo = createMockInventoryRepository();
    useCase = new DeleteIngredientUseCase(repo);
  });

  it('should delete an existing ingredient', async () => {
    vi.mocked(repo.findById).mockResolvedValue(createIngredient());
    vi.mocked(repo.delete).mockResolvedValue(undefined);

    await expect(useCase.execute('ing-1')).resolves.toBeUndefined();
    expect(repo.delete).toHaveBeenCalledWith('ing-1');
  });

  it('should throw NotFoundError when ingredient does not exist', async () => {
    vi.mocked(repo.findById).mockResolvedValue(null);

    await expect(useCase.execute('nonexistent')).rejects.toThrow(NotFoundError);
  });
});
