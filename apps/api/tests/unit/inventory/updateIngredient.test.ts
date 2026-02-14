import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateIngredientUseCase } from '../../../src/modules/inventory/use-cases/updateIngredient.js';
import { createMockInventoryRepository, createIngredient } from '../helpers/mock-factories.js';
import { NotFoundError } from '../../../src/core/errors/app-error.js';
import type { IInventoryRepository } from '../../../src/modules/inventory/inventory.repository.js';

describe('UpdateIngredientUseCase', () => {
  let useCase: UpdateIngredientUseCase;
  let repo: IInventoryRepository;

  beforeEach(() => {
    repo = createMockInventoryRepository();
    useCase = new UpdateIngredientUseCase(repo);
  });

  it('should update an existing ingredient', async () => {
    const existing = createIngredient();
    const updated = createIngredient({ name: 'Whole Wheat Flour' });
    vi.mocked(repo.findById).mockResolvedValue(existing);
    vi.mocked(repo.update).mockResolvedValue(updated);

    const result = await useCase.execute('ing-1', { name: 'Whole Wheat Flour' });

    expect(result.name).toBe('Whole Wheat Flour');
    expect(repo.findById).toHaveBeenCalledWith('ing-1');
    expect(repo.update).toHaveBeenCalledWith('ing-1', { name: 'Whole Wheat Flour' });
  });

  it('should throw NotFoundError when ingredient does not exist', async () => {
    vi.mocked(repo.findById).mockResolvedValue(null);

    await expect(useCase.execute('nonexistent', { name: 'X' })).rejects.toThrow(NotFoundError);
    await expect(useCase.execute('nonexistent', { name: 'X' })).rejects.toThrow('Ingredient not found');
  });
});
