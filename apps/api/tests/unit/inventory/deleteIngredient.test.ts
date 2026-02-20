import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InventoryCrud } from '../../../src/modules/inventory/inventoryCrud.js';

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

  it('should delete an ingredient by delegating to repository', async () => {
    vi.mocked(PgInventoryRepository.delete).mockResolvedValue(undefined);

    await expect(InventoryCrud.delete(STORE_ID, 'ing-1')).resolves.toBeUndefined();
    expect(PgInventoryRepository.delete).toHaveBeenCalledWith(STORE_ID, 'ing-1');
  });
});
