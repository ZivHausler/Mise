import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdjustStockUseCase } from '../../../src/modules/inventory/use-cases/adjustStock.js';
import { createMockInventoryRepository, createIngredient } from '../helpers/mock-factories.js';
import { NotFoundError, ValidationError } from '../../../src/core/errors/app-error.js';
import type { IInventoryRepository } from '../../../src/modules/inventory/inventory.repository.js';

describe('AdjustStockUseCase', () => {
  let useCase: AdjustStockUseCase;
  let repo: IInventoryRepository;

  beforeEach(() => {
    repo = createMockInventoryRepository();
    useCase = new AdjustStockUseCase(repo);
  });

  it('should adjust stock with addition type', async () => {
    const ingredient = createIngredient({ quantity: 50 });
    const updated = createIngredient({ quantity: 60 });
    vi.mocked(repo.findById).mockResolvedValue(ingredient);
    vi.mocked(repo.adjustStock).mockResolvedValue(updated);

    const result = await useCase.execute({
      ingredientId: 'ing-1',
      type: 'addition',
      quantity: 10,
    });

    expect(result.quantity).toBe(60);
    expect(repo.adjustStock).toHaveBeenCalledOnce();
  });

  it('should adjust stock with usage type when sufficient stock', async () => {
    const ingredient = createIngredient({ quantity: 50 });
    const updated = createIngredient({ quantity: 40 });
    vi.mocked(repo.findById).mockResolvedValue(ingredient);
    vi.mocked(repo.adjustStock).mockResolvedValue(updated);

    const result = await useCase.execute({
      ingredientId: 'ing-1',
      type: 'usage',
      quantity: 10,
    });

    expect(result.quantity).toBe(40);
  });

  it('should throw ValidationError when usage exceeds stock', async () => {
    vi.mocked(repo.findById).mockResolvedValue(createIngredient({ quantity: 5 }));

    await expect(
      useCase.execute({ ingredientId: 'ing-1', type: 'usage', quantity: 10 }),
    ).rejects.toThrow('Insufficient stock for this usage');
  });

  it('should throw ValidationError when quantity is zero', async () => {
    vi.mocked(repo.findById).mockResolvedValue(createIngredient());

    await expect(
      useCase.execute({ ingredientId: 'ing-1', type: 'addition', quantity: 0 }),
    ).rejects.toThrow('Adjustment quantity must be positive');
  });

  it('should throw ValidationError when quantity is negative', async () => {
    vi.mocked(repo.findById).mockResolvedValue(createIngredient());

    await expect(
      useCase.execute({ ingredientId: 'ing-1', type: 'addition', quantity: -5 }),
    ).rejects.toThrow('Adjustment quantity must be positive');
  });

  it('should throw NotFoundError when ingredient does not exist', async () => {
    vi.mocked(repo.findById).mockResolvedValue(null);

    await expect(
      useCase.execute({ ingredientId: 'nonexistent', type: 'addition', quantity: 10 }),
    ).rejects.toThrow(NotFoundError);
  });

  it('should allow adjustment type (can be positive or negative in repository)', async () => {
    const ingredient = createIngredient({ quantity: 50 });
    const updated = createIngredient({ quantity: 55 });
    vi.mocked(repo.findById).mockResolvedValue(ingredient);
    vi.mocked(repo.adjustStock).mockResolvedValue(updated);

    const result = await useCase.execute({
      ingredientId: 'ing-1',
      type: 'adjustment',
      quantity: 5,
    });

    expect(result.quantity).toBe(55);
  });

  it('should allow usage that brings stock to exactly zero', async () => {
    const ingredient = createIngredient({ quantity: 10 });
    const updated = createIngredient({ quantity: 0 });
    vi.mocked(repo.findById).mockResolvedValue(ingredient);
    vi.mocked(repo.adjustStock).mockResolvedValue(updated);

    const result = await useCase.execute({
      ingredientId: 'ing-1',
      type: 'usage',
      quantity: 10,
    });

    expect(result.quantity).toBe(0);
  });
});
