import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateIngredientUseCase } from '../../../src/modules/inventory/use-cases/createIngredient.js';
import { createMockInventoryRepository, createIngredient } from '../helpers/mock-factories.js';
import { ValidationError } from '../../../src/core/errors/app-error.js';
import type { IInventoryRepository } from '../../../src/modules/inventory/inventory.repository.js';

describe('CreateIngredientUseCase', () => {
  let useCase: CreateIngredientUseCase;
  let repo: IInventoryRepository;

  beforeEach(() => {
    repo = createMockInventoryRepository();
    useCase = new CreateIngredientUseCase(repo);
  });

  it('should create an ingredient with valid data', async () => {
    const ingredient = createIngredient();
    vi.mocked(repo.create).mockResolvedValue(ingredient);

    const result = await useCase.execute({
      name: 'Flour',
      unit: 'kg',
      quantity: 50,
      costPerUnit: 3.5,
      lowStockThreshold: 10,
    });

    expect(result).toEqual(ingredient);
    expect(repo.create).toHaveBeenCalledOnce();
  });

  it('should throw ValidationError when name is empty', async () => {
    await expect(
      useCase.execute({ name: '', unit: 'kg', quantity: 10, costPerUnit: 1, lowStockThreshold: 5 }),
    ).rejects.toThrow(ValidationError);
    await expect(
      useCase.execute({ name: '   ', unit: 'kg', quantity: 10, costPerUnit: 1, lowStockThreshold: 5 }),
    ).rejects.toThrow('Ingredient name is required');
  });

  it('should throw ValidationError when quantity is negative', async () => {
    await expect(
      useCase.execute({ name: 'Sugar', unit: 'kg', quantity: -5, costPerUnit: 2, lowStockThreshold: 5 }),
    ).rejects.toThrow('Quantity must be non-negative');
  });

  it('should throw ValidationError when costPerUnit is negative', async () => {
    await expect(
      useCase.execute({ name: 'Sugar', unit: 'kg', quantity: 10, costPerUnit: -1, lowStockThreshold: 5 }),
    ).rejects.toThrow('Cost per unit must be non-negative');
  });

  it('should allow zero quantity', async () => {
    vi.mocked(repo.create).mockResolvedValue(createIngredient({ quantity: 0 }));

    const result = await useCase.execute({
      name: 'Vanilla', unit: 'ml', quantity: 0, costPerUnit: 10, lowStockThreshold: 5,
    });

    expect(result.quantity).toBe(0);
  });

  it('should allow zero costPerUnit', async () => {
    vi.mocked(repo.create).mockResolvedValue(createIngredient({ costPerUnit: 0 }));

    const result = await useCase.execute({
      name: 'Water', unit: 'l', quantity: 100, costPerUnit: 0, lowStockThreshold: 10,
    });

    expect(result.costPerUnit).toBe(0);
  });
});
