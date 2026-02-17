import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InventoryCrud } from '../../../src/modules/inventory/crud/inventoryCrud.js';
import { createIngredient } from '../helpers/mock-factories.js';
import { NotFoundError } from '../../../src/core/errors/app-error.js';

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

describe('InventoryCrud.delete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete an existing ingredient', async () => {
    vi.mocked(PgInventoryRepository.findById).mockResolvedValue(createIngredient());
    vi.mocked(PgInventoryRepository.delete).mockResolvedValue(undefined);

    await expect(InventoryCrud.delete(STORE_ID, 'ing-1')).resolves.toBeUndefined();
    expect(PgInventoryRepository.delete).toHaveBeenCalledWith(STORE_ID, 'ing-1');
  });

  it('should throw NotFoundError when ingredient does not exist', async () => {
    vi.mocked(PgInventoryRepository.findById).mockResolvedValue(null);

    await expect(InventoryCrud.delete(STORE_ID, 'nonexistent')).rejects.toThrow(NotFoundError);
  });
});
