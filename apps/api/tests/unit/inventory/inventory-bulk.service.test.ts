import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createIngredient } from '../helpers/mock-factories.js';
import { InventoryLogType } from '@mise/shared';

// ─── Mock InventoryCrud ────────────────────────────────────────
vi.mock('../../../src/modules/inventory/inventoryCrud.js', () => ({
  InventoryCrud: {
    getById: vi.fn(),
    getAll: vi.fn(),
    adjustStock: vi.fn(),
    delete: vi.fn(),
  },
}));

// ─── Mock RecipeCrud ───────────────────────────────────────────
vi.mock('../../../src/modules/recipes/recipeCrud.js', () => ({
  RecipeCrud: {
    countByIngredient: vi.fn(),
  },
}));

// ─── Mock AdjustStockUseCase ───────────────────────────────────
const mockExecute = vi.fn();
vi.mock('../../../src/modules/inventory/use-cases/adjustStock.js', () => ({
  AdjustStockUseCase: class {
    execute = mockExecute;
  },
}));

import { InventoryService } from '../../../src/modules/inventory/inventory.service.js';
import { InventoryCrud } from '../../../src/modules/inventory/inventoryCrud.js';
import { RecipeCrud } from '../../../src/modules/recipes/recipeCrud.js';

const STORE_ID = 1;

describe('InventoryService — bulk operations', () => {
  let service: InventoryService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new InventoryService();
  });

  // ─── adjustBulk ────────────────────────────────────────────────

  describe('adjustBulk', () => {
    it('should successfully adjust multiple items', async () => {
      const flour = createIngredient({ id: 1, name: 'Flour', quantity: 50 });
      const sugar = createIngredient({ id: 2, name: 'Sugar', quantity: 30 });

      vi.mocked(InventoryCrud.getById)
        .mockResolvedValueOnce(createIngredient({ id: 1, quantity: 50 }))   // flour before
        .mockResolvedValueOnce(createIngredient({ id: 2, quantity: 30 }));  // sugar before

      mockExecute
        .mockResolvedValueOnce({ ...flour, quantity: 60 })
        .mockResolvedValueOnce({ ...sugar, quantity: 35 });

      const result = await service.adjustBulk(STORE_ID, [
        { ingredientId: 1, quantity: 10, pricePaid: 35 },
        { ingredientId: 2, quantity: 5, pricePaid: 25 },
      ]);

      expect(result.summary).toEqual({ total: 2, succeeded: 2, failed: 0 });
      expect(result.results).toHaveLength(2);
      expect(result.results[0]).toMatchObject({
        ingredientId: 1,
        previousQuantity: 50,
        newQuantity: 60,
        success: true,
      });
      expect(result.results[1]).toMatchObject({
        ingredientId: 2,
        previousQuantity: 30,
        newQuantity: 35,
        success: true,
      });
    });

    it('should handle partial success — one fails, others succeed', async () => {
      vi.mocked(InventoryCrud.getById)
        .mockResolvedValueOnce(createIngredient({ id: 1, quantity: 50 }))
        .mockResolvedValueOnce(null);  // ingredient 999 not found

      mockExecute
        .mockResolvedValueOnce(createIngredient({ id: 1, name: 'Flour', quantity: 60 }))
        .mockRejectedValueOnce(new Error('Ingredient not found'));

      const result = await service.adjustBulk(STORE_ID, [
        { ingredientId: 1, quantity: 10, pricePaid: 35 },
        { ingredientId: 999, quantity: 5, pricePaid: 25 },
      ]);

      expect(result.summary).toEqual({ total: 2, succeeded: 1, failed: 1 });
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
      expect(result.results[1].error).toBe('Ingredient not found');
    });

    it('should use type ADDITION for each adjustment', async () => {
      vi.mocked(InventoryCrud.getById).mockResolvedValue(
        createIngredient({ id: 1, quantity: 50 }),
      );
      mockExecute.mockResolvedValue(createIngredient({ id: 1, name: 'Flour', quantity: 60 }));

      await service.adjustBulk(STORE_ID, [
        { ingredientId: 1, quantity: 10, pricePaid: 35 },
      ]);

      expect(mockExecute).toHaveBeenCalledWith(
        STORE_ID,
        expect.objectContaining({ type: InventoryLogType.ADDITION }),
        undefined,
      );
    });

    it('should pass pricePaid through to the use case', async () => {
      vi.mocked(InventoryCrud.getById).mockResolvedValue(
        createIngredient({ id: 1, quantity: 50 }),
      );
      mockExecute.mockResolvedValue(createIngredient({ id: 1, name: 'Flour', quantity: 60 }));

      await service.adjustBulk(STORE_ID, [
        { ingredientId: 1, quantity: 10, pricePaid: 42.5 },
      ]);

      expect(mockExecute).toHaveBeenCalledWith(
        STORE_ID,
        expect.objectContaining({ pricePaid: 42.5 }),
        undefined,
      );
    });

    it('should pass custom reason through to the use case', async () => {
      vi.mocked(InventoryCrud.getById).mockResolvedValue(
        createIngredient({ id: 1, quantity: 50 }),
      );
      mockExecute.mockResolvedValue(createIngredient({ id: 1, name: 'Flour', quantity: 60 }));

      await service.adjustBulk(STORE_ID, [
        { ingredientId: 1, quantity: 10, pricePaid: 35, reason: 'Weekly restock' },
      ]);

      expect(mockExecute).toHaveBeenCalledWith(
        STORE_ID,
        expect.objectContaining({ reason: 'Weekly restock' }),
        undefined,
      );
    });

    it('should use default reason when none provided', async () => {
      vi.mocked(InventoryCrud.getById).mockResolvedValue(
        createIngredient({ id: 1, quantity: 50 }),
      );
      mockExecute.mockResolvedValue(createIngredient({ id: 1, name: 'Flour', quantity: 60 }));

      await service.adjustBulk(STORE_ID, [
        { ingredientId: 1, quantity: 10, pricePaid: 35 },
      ]);

      expect(mockExecute).toHaveBeenCalledWith(
        STORE_ID,
        expect.objectContaining({ reason: 'Receipt bulk restock' }),
        undefined,
      );
    });

    it('should pass correlationId to the use case', async () => {
      vi.mocked(InventoryCrud.getById).mockResolvedValue(
        createIngredient({ id: 1, quantity: 50 }),
      );
      mockExecute.mockResolvedValue(createIngredient({ id: 1, name: 'Flour', quantity: 60 }));

      await service.adjustBulk(STORE_ID, [
        { ingredientId: 1, quantity: 10, pricePaid: 35 },
      ], 'corr-123');

      expect(mockExecute).toHaveBeenCalledWith(
        STORE_ID,
        expect.anything(),
        'corr-123',
      );
    });

    it('should handle empty adjustments array', async () => {
      const result = await service.adjustBulk(STORE_ID, []);

      expect(result.summary).toEqual({ total: 0, succeeded: 0, failed: 0 });
      expect(result.results).toHaveLength(0);
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('should handle non-existent ingredient IDs gracefully', async () => {
      vi.mocked(InventoryCrud.getById).mockResolvedValue(null);
      mockExecute.mockRejectedValue(new Error('Ingredient not found'));

      const result = await service.adjustBulk(STORE_ID, [
        { ingredientId: 999, quantity: 10, pricePaid: 50 },
      ]);

      expect(result.summary).toEqual({ total: 1, succeeded: 0, failed: 1 });
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].ingredientId).toBe(999);
    });
  });

  // ─── deleteBulk ────────────────────────────────────────────────

  describe('deleteBulk', () => {
    it('should delete multiple ingredients successfully', async () => {
      vi.mocked(InventoryCrud.getById)
        .mockResolvedValueOnce(createIngredient({ id: 1 }))
        .mockResolvedValueOnce(createIngredient({ id: 2 }));
      vi.mocked(RecipeCrud.countByIngredient)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      vi.mocked(InventoryCrud.delete).mockResolvedValue(undefined);

      const result = await service.deleteBulk(STORE_ID, [1, 2]);

      expect(result.deleted).toEqual([1, 2]);
      expect(result.skipped).toEqual([]);
    });

    it('should skip ingredients that do not exist', async () => {
      vi.mocked(InventoryCrud.getById)
        .mockResolvedValueOnce(createIngredient({ id: 1 }))
        .mockResolvedValueOnce(null);  // id 999 not found
      vi.mocked(RecipeCrud.countByIngredient).mockResolvedValueOnce(0);
      vi.mocked(InventoryCrud.delete).mockResolvedValue(undefined);

      const result = await service.deleteBulk(STORE_ID, [1, 999]);

      expect(result.deleted).toEqual([1]);
      expect(result.skipped).toEqual([999]);
    });

    it('should skip ingredients that are in use by recipes', async () => {
      vi.mocked(InventoryCrud.getById)
        .mockResolvedValueOnce(createIngredient({ id: 1 }))
        .mockResolvedValueOnce(createIngredient({ id: 2 }));
      vi.mocked(RecipeCrud.countByIngredient)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(3);  // id 2 is used in 3 recipes

      vi.mocked(InventoryCrud.delete).mockResolvedValue(undefined);

      const result = await service.deleteBulk(STORE_ID, [1, 2]);

      expect(result.deleted).toEqual([1]);
      expect(result.skipped).toEqual([2]);
    });

    it('should return empty arrays when given empty ingredientIds', async () => {
      const result = await service.deleteBulk(STORE_ID, []);

      expect(result.deleted).toEqual([]);
      expect(result.skipped).toEqual([]);
    });

    it('should skip all when none can be deleted', async () => {
      vi.mocked(InventoryCrud.getById)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createIngredient({ id: 2 }));
      vi.mocked(RecipeCrud.countByIngredient).mockResolvedValueOnce(5);

      const result = await service.deleteBulk(STORE_ID, [999, 2]);

      expect(result.deleted).toEqual([]);
      expect(result.skipped).toEqual([999, 2]);
    });
  });
});
