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

describe('InventoryCrud.update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update an ingredient by delegating to repository', async () => {
    const updated = createIngredient({ name: 'Whole Wheat Flour' });
    vi.mocked(PgInventoryRepository.update).mockResolvedValue(updated);

    const result = await InventoryCrud.update(STORE_ID, 'ing-1', { name: 'Whole Wheat Flour' });

    expect(result.name).toBe('Whole Wheat Flour');
    expect(PgInventoryRepository.update).toHaveBeenCalledWith(STORE_ID, 'ing-1', { name: 'Whole Wheat Flour' });
  });
});
