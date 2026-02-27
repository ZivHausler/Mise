import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictError, NotFoundError } from '../../../src/core/errors/app-error.js';
import { createIngredient } from '../helpers/mock-factories.js';

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

vi.mock('../../../src/modules/inventory/use-cases/adjustStock.js', () => ({
  AdjustStockUseCase: class { async execute() { return createIngredient(); } },
}));

vi.mock('../../../src/modules/recipes/recipeCrud.js', () => ({
  RecipeCrud: { countByIngredient: vi.fn() },
}));

import { InventoryCrud } from '../../../src/modules/inventory/inventoryCrud.js';
import { RecipeCrud } from '../../../src/modules/recipes/recipeCrud.js';
import { InventoryService } from '../../../src/modules/inventory/inventory.service.js';

const STORE_ID = 1;

describe('InventoryService - Gap Coverage', () => {
  let service: InventoryService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new InventoryService();
  });

  describe('create', () => {
    it('should create ingredient', async () => {
      const ingredient = createIngredient();
      vi.mocked(InventoryCrud.create).mockResolvedValue(ingredient);
      const result = await service.create(STORE_ID, { name: 'Flour', unit: 'kg', quantity: 50, costPerUnit: 3.5 });
      expect(result).toEqual(ingredient);
    });
  });

  describe('update', () => {
    it('should update ingredient when found', async () => {
      const ingredient = createIngredient();
      vi.mocked(InventoryCrud.getById).mockResolvedValue(ingredient);
      vi.mocked(InventoryCrud.update).mockResolvedValue({ ...ingredient, name: 'Updated' });
      const result = await service.update(STORE_ID, 1, { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });

    it('should throw NotFoundError when ingredient not found', async () => {
      vi.mocked(InventoryCrud.getById).mockResolvedValue(null);
      await expect(service.update(STORE_ID, 999, { name: 'x' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('should delete ingredient when not used in recipes', async () => {
      vi.mocked(InventoryCrud.getById).mockResolvedValue(createIngredient());
      vi.mocked(RecipeCrud.countByIngredient).mockResolvedValue(0);
      vi.mocked(InventoryCrud.delete).mockResolvedValue(undefined);
      await expect(service.delete(STORE_ID, 1)).resolves.toBeUndefined();
    });

    it('should throw NotFoundError when ingredient not found', async () => {
      vi.mocked(InventoryCrud.getById).mockResolvedValue(null);
      await expect(service.delete(STORE_ID, 999)).rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError when ingredient is used in recipes', async () => {
      vi.mocked(InventoryCrud.getById).mockResolvedValue(createIngredient());
      vi.mocked(RecipeCrud.countByIngredient).mockResolvedValue(3);
      await expect(service.delete(STORE_ID, 1)).rejects.toThrow(ConflictError);
    });
  });

  describe('getAllPaginated', () => {
    it('should pass all params to crud', async () => {
      vi.mocked(InventoryCrud.getAllPaginated).mockResolvedValue({ items: [], total: 0, page: 1, limit: 10, totalPages: 0 });
      await service.getAllPaginated(STORE_ID, 2, 20, 'flour', [1, 2], ['active']);
      expect(InventoryCrud.getAllPaginated).toHaveBeenCalledWith(STORE_ID, 2, 20, 'flour', [1, 2], ['active']);
    });
  });

  describe('getLog', () => {
    it('should return inventory log', async () => {
      vi.mocked(InventoryCrud.getLog).mockResolvedValue([{ id: 1 }] as any);
      const result = await service.getLog(STORE_ID, 1);
      expect(result).toHaveLength(1);
    });
  });
});
