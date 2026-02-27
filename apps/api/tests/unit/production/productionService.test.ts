import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundError, ValidationError } from '../../../src/core/errors/app-error.js';
import type { ProductionBatch } from '../../../src/modules/production/production.types.js';
import { PRODUCTION_STAGE } from '../../../src/modules/production/production.types.js';

// ─── Mocks ─────────────────────────────────────────────────────

vi.mock('../../../src/modules/production/productionCrud.js', () => ({
  ProductionCrud: {
    findByDate: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateStage: vi.fn(),
    delete: vi.fn(),
    createBatchOrder: vi.fn(),
    createPrepItem: vi.fn(),
    getPrepItemById: vi.fn(),
    togglePrepItem: vi.fn(),
    getAggregatedPrepList: vi.fn(),
    getTimelineData: vi.fn(),
    getBatchOrdersByBatchId: vi.fn(),
  },
}));

vi.mock('../../../src/modules/orders/orderCrud.js', () => ({
  OrderCrud: {
    findByDateRange: vi.fn(),
  },
}));

vi.mock('../../../src/core/events/event-bus.js', () => ({
  getEventBus: vi.fn(() => ({
    publish: vi.fn().mockResolvedValue(undefined),
  })),
}));

import { ProductionCrud } from '../../../src/modules/production/productionCrud.js';
import { OrderCrud } from '../../../src/modules/orders/orderCrud.js';
import { ProductionService } from '../../../src/modules/production/production.service.js';

const STORE_ID = 1;

function createBatch(overrides?: Partial<ProductionBatch>): ProductionBatch {
  return {
    id: 1,
    storeId: STORE_ID,
    recipe: { id: 'recipe-1', name: 'Chocolate Cake' },
    quantity: 10,
    stage: PRODUCTION_STAGE.TO_PREP,
    productionDate: '2025-06-15',
    priority: 0,
    source: 'manual' as const,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

describe('ProductionService', () => {
  let service: ProductionService;
  let mockRecipeService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRecipeService = {
      getById: vi.fn().mockResolvedValue({
        id: 'recipe-1',
        name: 'Chocolate Cake',
        ingredients: [
          { ingredientId: '1', name: 'Flour', quantity: 0.5, unit: 'kg' },
          { ingredientId: '2', name: 'Sugar', quantity: 0.3, unit: 'kg' },
        ],
      }),
    };
    service = new ProductionService(mockRecipeService, undefined);
  });

  // ─── getBatchById ──────────────────────────────────────────────

  describe('getBatchById', () => {
    it('should return batch when found', async () => {
      const batch = createBatch();
      vi.mocked(ProductionCrud.findById).mockResolvedValue(batch);

      const result = await service.getBatchById(STORE_ID, 1);
      expect(result).toEqual(batch);
    });

    it('should throw NotFoundError when batch not found', async () => {
      vi.mocked(ProductionCrud.findById).mockResolvedValue(null);

      await expect(service.getBatchById(STORE_ID, 999)).rejects.toThrow(NotFoundError);
    });
  });

  // ─── getBatchesByDate ──────────────────────────────────────────

  describe('getBatchesByDate', () => {
    it('should return batches for a date', async () => {
      const batches = [createBatch(), createBatch({ id: 2 })];
      vi.mocked(ProductionCrud.findByDate).mockResolvedValue(batches);

      const result = await service.getBatchesByDate(STORE_ID, '2025-06-15');
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no batches', async () => {
      vi.mocked(ProductionCrud.findByDate).mockResolvedValue([]);

      const result = await service.getBatchesByDate(STORE_ID, '2025-06-15');
      expect(result).toHaveLength(0);
    });
  });

  // ─── createBatch ───────────────────────────────────────────────

  describe('createBatch', () => {
    it('should create batch and prep items from recipe', async () => {
      const batch = createBatch();
      vi.mocked(ProductionCrud.create).mockResolvedValue(batch);
      vi.mocked(ProductionCrud.createPrepItem).mockResolvedValue(undefined as any);

      const result = await service.createBatch(STORE_ID, {
        recipeId: 'recipe-1',
        quantity: 10,
        productionDate: '2025-06-15',
      });

      expect(result).toEqual(batch);
      // 2 ingredients × 10 quantity → 2 prep items
      expect(ProductionCrud.createPrepItem).toHaveBeenCalledTimes(2);
    });

    it('should look up recipe name when not provided', async () => {
      const batch = createBatch();
      vi.mocked(ProductionCrud.create).mockResolvedValue(batch);

      await service.createBatch(STORE_ID, {
        recipeId: 'recipe-1',
        quantity: 5,
        productionDate: '2025-06-15',
      });

      expect(mockRecipeService.getById).toHaveBeenCalledWith(STORE_ID, 'recipe-1');
    });

    it('should use provided recipeName instead of looking up', async () => {
      const batch = createBatch();
      vi.mocked(ProductionCrud.create).mockResolvedValue(batch);

      await service.createBatch(STORE_ID, {
        recipeId: 'recipe-1',
        recipeName: 'Custom Name',
        quantity: 5,
        productionDate: '2025-06-15',
      });

      expect(ProductionCrud.create).toHaveBeenCalledWith(STORE_ID, expect.objectContaining({
        recipeName: 'Custom Name',
      }));
    });

    it('should scale prep item quantities by batch quantity', async () => {
      const batch = createBatch({ quantity: 4 });
      vi.mocked(ProductionCrud.create).mockResolvedValue(batch);

      await service.createBatch(STORE_ID, {
        recipeId: 'recipe-1',
        quantity: 4,
        productionDate: '2025-06-15',
      });

      // Flour: 0.5 * 4 = 2.0, Sugar: 0.3 * 4 = 1.2
      expect(ProductionCrud.createPrepItem).toHaveBeenCalledWith(STORE_ID, expect.objectContaining({
        requiredQuantity: 2,
      }));
      expect(ProductionCrud.createPrepItem).toHaveBeenCalledWith(STORE_ID, expect.objectContaining({
        requiredQuantity: 1.2,
      }));
    });

    it('should create batch without recipe service', async () => {
      const serviceNoRecipe = new ProductionService(undefined, undefined);
      const batch = createBatch();
      vi.mocked(ProductionCrud.create).mockResolvedValue(batch);

      const result = await serviceNoRecipe.createBatch(STORE_ID, {
        recipeId: 'recipe-1',
        quantity: 5,
        productionDate: '2025-06-15',
      });

      expect(result).toEqual(batch);
      expect(ProductionCrud.createPrepItem).not.toHaveBeenCalled();
    });
  });

  // ─── updateStage ───────────────────────────────────────────────

  describe('updateStage', () => {
    it('should update stage and publish event', async () => {
      const existing = createBatch({ stage: PRODUCTION_STAGE.TO_PREP });
      const updated = createBatch({ stage: PRODUCTION_STAGE.MIXING });
      vi.mocked(ProductionCrud.findById).mockResolvedValue(existing);
      vi.mocked(ProductionCrud.updateStage).mockResolvedValue(updated);

      const result = await service.updateStage(STORE_ID, 1, PRODUCTION_STAGE.MIXING);
      expect(result.stage).toBe(PRODUCTION_STAGE.MIXING);
    });

    it('should throw NotFoundError when batch not found', async () => {
      vi.mocked(ProductionCrud.findById).mockResolvedValue(null);

      await expect(service.updateStage(STORE_ID, 999, PRODUCTION_STAGE.MIXING)).rejects.toThrow(NotFoundError);
    });

    it('should publish BATCH_COMPLETED when stage reaches PACKAGED', async () => {
      const existing = createBatch({ stage: PRODUCTION_STAGE.READY });
      const updated = createBatch({ stage: PRODUCTION_STAGE.PACKAGED });
      vi.mocked(ProductionCrud.findById).mockResolvedValue(existing);
      vi.mocked(ProductionCrud.updateStage).mockResolvedValue(updated);

      // Track the publish mock before calling
      const { getEventBus } = await import('../../../src/core/events/event-bus.js');
      const publishMock = vi.fn().mockResolvedValue(undefined);
      vi.mocked(getEventBus).mockReturnValue({ publish: publishMock, subscribe: vi.fn() });

      await service.updateStage(STORE_ID, 1, PRODUCTION_STAGE.PACKAGED);
      // Event bus publish should be called twice: stage change + completed
      expect(publishMock).toHaveBeenCalledTimes(2);
    });
  });

  // ─── updateBatch ───────────────────────────────────────────────

  describe('updateBatch', () => {
    it('should update batch when found', async () => {
      const existing = createBatch();
      const updated = createBatch({ quantity: 20 });
      vi.mocked(ProductionCrud.findById).mockResolvedValue(existing);
      vi.mocked(ProductionCrud.update).mockResolvedValue(updated);

      const result = await service.updateBatch(STORE_ID, 1, { quantity: 20 });
      expect(result.quantity).toBe(20);
    });

    it('should throw NotFoundError when batch not found', async () => {
      vi.mocked(ProductionCrud.findById).mockResolvedValue(null);

      await expect(service.updateBatch(STORE_ID, 999, { quantity: 5 })).rejects.toThrow(NotFoundError);
    });
  });

  // ─── deleteBatch ───────────────────────────────────────────────

  describe('deleteBatch', () => {
    it('should delete batch when found', async () => {
      vi.mocked(ProductionCrud.findById).mockResolvedValue(createBatch());
      vi.mocked(ProductionCrud.delete).mockResolvedValue(undefined);

      await expect(service.deleteBatch(STORE_ID, 1)).resolves.toBeUndefined();
    });

    it('should throw NotFoundError when batch not found', async () => {
      vi.mocked(ProductionCrud.findById).mockResolvedValue(null);

      await expect(service.deleteBatch(STORE_ID, 999)).rejects.toThrow(NotFoundError);
    });
  });

  // ─── splitBatch ────────────────────────────────────────────────

  describe('splitBatch', () => {
    it('should split batch into two', async () => {
      const existing = createBatch({ quantity: 10, stage: PRODUCTION_STAGE.MIXING });
      const reduced = createBatch({ quantity: 7 });
      const newBatch = createBatch({ id: 2, quantity: 3 });
      const newBatchStaged = createBatch({ id: 2, quantity: 3, stage: PRODUCTION_STAGE.MIXING });

      vi.mocked(ProductionCrud.findById).mockResolvedValue(existing);
      vi.mocked(ProductionCrud.update).mockResolvedValue(reduced);
      vi.mocked(ProductionCrud.create).mockResolvedValue(newBatch);
      vi.mocked(ProductionCrud.updateStage).mockResolvedValue(newBatchStaged);

      const result = await service.splitBatch(STORE_ID, 1, 3);
      expect(result.original.quantity).toBe(7);
      expect(result.newBatch.quantity).toBe(3);
    });

    it('should throw NotFoundError when batch not found', async () => {
      vi.mocked(ProductionCrud.findById).mockResolvedValue(null);

      await expect(service.splitBatch(STORE_ID, 999, 5)).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when split quantity >= batch quantity', async () => {
      vi.mocked(ProductionCrud.findById).mockResolvedValue(createBatch({ quantity: 10 }));

      await expect(service.splitBatch(STORE_ID, 1, 10)).rejects.toThrow(ValidationError);
      await expect(service.splitBatch(STORE_ID, 1, 15)).rejects.toThrow(ValidationError);
    });

    it('should not update stage on new batch if original stage is TO_PREP (0)', async () => {
      const existing = createBatch({ quantity: 10, stage: PRODUCTION_STAGE.TO_PREP });
      vi.mocked(ProductionCrud.findById).mockResolvedValue(existing);
      vi.mocked(ProductionCrud.update).mockResolvedValue(createBatch({ quantity: 7 }));
      vi.mocked(ProductionCrud.create).mockResolvedValue(createBatch({ id: 2, quantity: 3 }));

      await service.splitBatch(STORE_ID, 1, 3);
      expect(ProductionCrud.updateStage).not.toHaveBeenCalled();
    });
  });

  // ─── mergeBatches ──────────────────────────────────────────────

  describe('mergeBatches', () => {
    it('should merge batches with same recipe and date', async () => {
      const batch1 = createBatch({ id: 1, quantity: 5, priority: 1, stage: PRODUCTION_STAGE.MIXING });
      const batch2 = createBatch({ id: 2, quantity: 3, priority: 2, stage: PRODUCTION_STAGE.MIXING });
      const merged = createBatch({ id: 3, quantity: 8, priority: 2 });

      vi.mocked(ProductionCrud.findById)
        .mockResolvedValueOnce(batch1)
        .mockResolvedValueOnce(batch2);
      vi.mocked(ProductionCrud.create).mockResolvedValue(merged);
      vi.mocked(ProductionCrud.updateStage).mockResolvedValue({ ...merged, stage: PRODUCTION_STAGE.MIXING });
      vi.mocked(ProductionCrud.getBatchOrdersByBatchId).mockResolvedValue([]);
      vi.mocked(ProductionCrud.delete).mockResolvedValue(undefined);

      const result = await service.mergeBatches(STORE_ID, [1, 2]);
      expect(result.quantity).toBe(8);
    });

    it('should throw NotFoundError when any batch not found', async () => {
      vi.mocked(ProductionCrud.findById)
        .mockResolvedValueOnce(createBatch({ id: 1 }))
        .mockResolvedValueOnce(null);

      await expect(service.mergeBatches(STORE_ID, [1, 2])).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when recipes differ', async () => {
      vi.mocked(ProductionCrud.findById)
        .mockResolvedValueOnce(createBatch({ id: 1, recipe: { id: 'recipe-1', name: 'Cake' } }))
        .mockResolvedValueOnce(createBatch({ id: 2, recipe: { id: 'recipe-2', name: 'Bread' } }));

      await expect(service.mergeBatches(STORE_ID, [1, 2])).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when production dates differ', async () => {
      vi.mocked(ProductionCrud.findById)
        .mockResolvedValueOnce(createBatch({ id: 1, productionDate: '2025-06-15' }))
        .mockResolvedValueOnce(createBatch({ id: 2, productionDate: '2025-06-16' }));

      await expect(service.mergeBatches(STORE_ID, [1, 2])).rejects.toThrow(ValidationError);
    });

    it('should delete original batches after merge', async () => {
      const batch1 = createBatch({ id: 1, quantity: 5 });
      const batch2 = createBatch({ id: 2, quantity: 3 });
      vi.mocked(ProductionCrud.findById)
        .mockResolvedValueOnce(batch1)
        .mockResolvedValueOnce(batch2);
      vi.mocked(ProductionCrud.create).mockResolvedValue(createBatch({ id: 3, quantity: 8 }));
      vi.mocked(ProductionCrud.getBatchOrdersByBatchId).mockResolvedValue([]);
      vi.mocked(ProductionCrud.delete).mockResolvedValue(undefined);

      await service.mergeBatches(STORE_ID, [1, 2]);
      expect(ProductionCrud.delete).toHaveBeenCalledTimes(2);
      expect(ProductionCrud.delete).toHaveBeenCalledWith(STORE_ID, 1);
      expect(ProductionCrud.delete).toHaveBeenCalledWith(STORE_ID, 2);
    });
  });

  // ─── generateBatches ──────────────────────────────────────────

  describe('generateBatches', () => {
    it('should return empty array when no eligible orders', async () => {
      vi.mocked(OrderCrud.findByDateRange).mockResolvedValue([]);

      const result = await service.generateBatches(STORE_ID, '2025-06-15');
      expect(result).toHaveLength(0);
    });

    it('should skip non-eligible order statuses', async () => {
      vi.mocked(OrderCrud.findByDateRange).mockResolvedValue([
        { id: 1, status: 4, items: [{ recipeId: 'r1', quantity: 5 }] } as any, // CANCELLED
      ]);

      const result = await service.generateBatches(STORE_ID, '2025-06-15');
      expect(result).toHaveLength(0);
    });

    it('should group items by recipe and sum quantities', async () => {
      vi.mocked(OrderCrud.findByDateRange).mockResolvedValue([
        { id: 1, status: 0, items: [{ recipeId: 'recipe-1', quantity: 5 }] } as any,
        { id: 2, status: 0, items: [{ recipeId: 'recipe-1', quantity: 3 }] } as any,
      ]);
      vi.mocked(ProductionCrud.create).mockImplementation(async (_sid, data) => {
        expect(data.quantity).toBe(8);
        return createBatch({ quantity: 8 });
      });
      vi.mocked(ProductionCrud.createBatchOrder).mockResolvedValue(undefined as any);

      const result = await service.generateBatches(STORE_ID, '2025-06-15');
      expect(result).toHaveLength(1);
    });
  });

  // ─── togglePrepItem ────────────────────────────────────────────

  describe('togglePrepItem', () => {
    it('should throw NotFoundError when prep item not found', async () => {
      vi.mocked(ProductionCrud.getPrepItemById).mockResolvedValue(null);

      await expect(service.togglePrepItem(STORE_ID, 999, true)).rejects.toThrow(NotFoundError);
    });

    it('should toggle prep item when found', async () => {
      vi.mocked(ProductionCrud.getPrepItemById).mockResolvedValue({ id: 1 } as any);
      vi.mocked(ProductionCrud.togglePrepItem).mockResolvedValue({ id: 1, isPrepped: true } as any);

      await expect(service.togglePrepItem(STORE_ID, 1, true)).resolves.toBeDefined();
    });
  });
});
