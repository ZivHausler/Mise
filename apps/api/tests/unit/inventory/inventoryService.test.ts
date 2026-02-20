import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InventoryService } from '../../../src/modules/inventory/inventory.service.js';
import { createIngredient } from '../helpers/mock-factories.js';
import { NotFoundError } from '../../../src/core/errors/app-error.js';
import { InventoryLogType } from '@mise/shared';

vi.mock('../../../src/modules/inventory/inventoryCrud.js', () => ({
  InventoryCrud: {
    create: vi.fn(),
    getById: vi.fn(),
    getAll: vi.fn(),
    getAllPaginated: vi.fn(),
    getLowStock: vi.fn(),
    update: vi.fn(),
    adjustStock: vi.fn(),
    getLog: vi.fn(),
    delete: vi.fn(),
  },
}));

let mockAdjustStockResult: any;

vi.mock('../../../src/modules/inventory/use-cases/adjustStock.js', () => ({
  AdjustStockUseCase: class {
    async execute() { return mockAdjustStockResult; }
  },
}));

import { InventoryCrud } from '../../../src/modules/inventory/inventoryCrud.js';

const STORE_ID = 'store-1';

describe('InventoryService', () => {
  let service: InventoryService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAdjustStockResult = undefined;
    service = new InventoryService();
  });

  describe('adjustStock', () => {
    it('should return adjusted ingredient', async () => {
      const updated = createIngredient({ quantity: 60 });
      mockAdjustStockResult = updated;

      const result = await service.adjustStock(STORE_ID, {
        ingredientId: 'ing-1',
        type: InventoryLogType.ADDITION,
        quantity: 10,
      });

      expect(result).toEqual(updated);
    });
  });

  describe('getById', () => {
    it('should return ingredient when found', async () => {
      const ingredient = createIngredient();
      vi.mocked(InventoryCrud.getById).mockResolvedValue(ingredient);

      const result = await service.getById(STORE_ID, 'ing-1');
      expect(result).toEqual(ingredient);
    });

    it('should throw NotFoundError when ingredient not found', async () => {
      vi.mocked(InventoryCrud.getById).mockResolvedValue(null);

      await expect(service.getById(STORE_ID, 'nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getAll', () => {
    it('should return all ingredients', async () => {
      const ingredients = [createIngredient({ id: 'i1' }), createIngredient({ id: 'i2' })];
      vi.mocked(InventoryCrud.getAll).mockResolvedValue(ingredients);

      const result = await service.getAll(STORE_ID);
      expect(result).toHaveLength(2);
    });

    it('should pass search parameter', async () => {
      vi.mocked(InventoryCrud.getAll).mockResolvedValue([]);

      await service.getAll(STORE_ID, 'flour');
      expect(InventoryCrud.getAll).toHaveBeenCalledWith(STORE_ID, 'flour');
    });
  });

  describe('getLowStock', () => {
    it('should return low stock ingredients', async () => {
      const lowStock = [createIngredient({ quantity: 3, lowStockThreshold: 10 })];
      vi.mocked(InventoryCrud.getLowStock).mockResolvedValue(lowStock);

      const result = await service.getLowStock(STORE_ID);
      expect(result).toHaveLength(1);
    });
  });
});
