import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InventoryService } from '../../../src/modules/inventory/inventory.service.js';
import { createIngredient } from '../helpers/mock-factories.js';
import { NotFoundError } from '../../../src/core/errors/app-error.js';

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
  AdjustStockUseCase: class {
    async execute() { return createIngredient(); }
  },
}));

vi.mock('../../../src/modules/recipes/recipeCrud.js', () => ({
  RecipeCrud: {
    countByIngredient: vi.fn(),
  },
}));

import { InventoryCrud } from '../../../src/modules/inventory/inventoryCrud.js';
import { RecipeCrud } from '../../../src/modules/recipes/recipeCrud.js';

const STORE_ID = 1;

describe('InventoryService - extended', () => {
  let service: InventoryService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new InventoryService();
  });

  describe('getAllPaginated', () => {
    it('should return paginated ingredients', async () => {
      const result = { data: [createIngredient()], total: 1, page: 1, limit: 10 };
      vi.mocked(InventoryCrud.getAllPaginated).mockResolvedValue(result);

      const res = await service.getAllPaginated(STORE_ID, 1, 10);
      expect(res.data).toHaveLength(1);
      expect(InventoryCrud.getAllPaginated).toHaveBeenCalledWith(STORE_ID, 1, 10, undefined, undefined, undefined);
    });

    it('should pass search, groupIds, and statuses', async () => {
      vi.mocked(InventoryCrud.getAllPaginated).mockResolvedValue({ data: [], total: 0, page: 1, limit: 10 });

      await service.getAllPaginated(STORE_ID, 1, 10, 'flour', ['g1'], ['low']);
      expect(InventoryCrud.getAllPaginated).toHaveBeenCalledWith(STORE_ID, 1, 10, 'flour', ['g1'], ['low']);
    });
  });

  describe('create', () => {
    it('should create an ingredient', async () => {
      const ingredient = createIngredient();
      vi.mocked(InventoryCrud.create).mockResolvedValue(ingredient);

      const result = await service.create(STORE_ID, {
        name: 'Flour',
        unit: 'kg',
        quantity: 50,
        costPerUnit: 3.5,
        lowStockThreshold: 10,
      });
      expect(result).toEqual(ingredient);
    });
  });

  describe('update', () => {
    it('should update an existing ingredient', async () => {
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

  describe('getLog', () => {
    it('should return inventory log', async () => {
      const logs = [{ id: 1, ingredientId: 1, type: 'addition', quantity: 10, createdAt: new Date() }] as any;
      vi.mocked(InventoryCrud.getLog).mockResolvedValue(logs);

      const result = await service.getLog(STORE_ID, 1);
      expect(result).toHaveLength(1);
      expect(InventoryCrud.getLog).toHaveBeenCalledWith(STORE_ID, 1);
    });
  });

  describe('delete', () => {
    it('should delete an existing ingredient', async () => {
      vi.mocked(InventoryCrud.getById).mockResolvedValue(createIngredient());
      vi.mocked(RecipeCrud.countByIngredient).mockResolvedValue(0);
      vi.mocked(InventoryCrud.delete).mockResolvedValue(undefined);

      await expect(service.delete(STORE_ID, 1)).resolves.toBeUndefined();
    });

    it('should throw NotFoundError when ingredient not found', async () => {
      vi.mocked(InventoryCrud.getById).mockResolvedValue(null);

      await expect(service.delete(STORE_ID, 999)).rejects.toThrow(NotFoundError);
    });
  });
});
