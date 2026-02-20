import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InventoryCrud } from '../../../src/modules/inventory/inventoryCrud.js';
import { createIngredient } from '../helpers/mock-factories.js';

vi.mock('../../../src/modules/inventory/inventory.repository.js', () => ({
  PgInventoryRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
    findAllPaginated: vi.fn(),
    findLowStock: vi.fn(),
    update: vi.fn(),
    adjustStock: vi.fn(),
    getLog: vi.fn(),
    delete: vi.fn(),
  },
}));

import { PgInventoryRepository } from '../../../src/modules/inventory/inventory.repository.js';

const STORE_ID = 'store-1';

describe('InventoryCrud.create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create an ingredient with valid data', async () => {
    const ingredient = createIngredient();
    vi.mocked(PgInventoryRepository.create).mockResolvedValue(ingredient);

    const result = await InventoryCrud.create(STORE_ID, {
      name: 'Flour',
      unit: 'kg',
      quantity: 50,
      costPerUnit: 3.5,
      lowStockThreshold: 10,
    });

    expect(result).toEqual(ingredient);
    expect(PgInventoryRepository.create).toHaveBeenCalledOnce();
  });

  it('should allow zero quantity', async () => {
    vi.mocked(PgInventoryRepository.create).mockResolvedValue(createIngredient({ quantity: 0 }));

    const result = await InventoryCrud.create(STORE_ID, {
      name: 'Vanilla', unit: 'ml', quantity: 0, costPerUnit: 10, lowStockThreshold: 5,
    });

    expect(result.quantity).toBe(0);
  });

  it('should allow zero costPerUnit', async () => {
    vi.mocked(PgInventoryRepository.create).mockResolvedValue(createIngredient({ costPerUnit: 0 }));

    const result = await InventoryCrud.create(STORE_ID, {
      name: 'Water', unit: 'l', quantity: 100, costPerUnit: 0, lowStockThreshold: 10,
    });

    expect(result.costPerUnit).toBe(0);
  });
});
