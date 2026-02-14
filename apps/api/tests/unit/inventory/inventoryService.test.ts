import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InventoryService } from '../../../src/modules/inventory/inventory.service.js';
import { createMockInventoryRepository, createMockEventBus, createIngredient } from '../helpers/mock-factories.js';
import { NotFoundError } from '../../../src/core/errors/app-error.js';
import type { IInventoryRepository } from '../../../src/modules/inventory/inventory.repository.js';
import type { EventBus } from '../../../src/core/events/event-bus.js';

describe('InventoryService', () => {
  let service: InventoryService;
  let repo: IInventoryRepository;
  let eventBus: EventBus;

  beforeEach(() => {
    repo = createMockInventoryRepository();
    eventBus = createMockEventBus();
    service = new InventoryService(repo, eventBus);
  });

  describe('adjustStock', () => {
    it('should publish inventory.lowStock event when stock falls below threshold', async () => {
      const lowStockIngredient = createIngredient({
        id: 'ing-1',
        name: 'Flour',
        quantity: 5,
        lowStockThreshold: 10,
      });
      vi.mocked(repo.findById).mockResolvedValue(createIngredient({ quantity: 15 }));
      vi.mocked(repo.adjustStock).mockResolvedValue(lowStockIngredient);

      await service.adjustStock({
        ingredientId: 'ing-1',
        type: 'usage',
        quantity: 10,
      });

      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'inventory.lowStock',
          payload: expect.objectContaining({
            ingredientId: 'ing-1',
            name: 'Flour',
            currentQuantity: 5,
            threshold: 10,
          }),
        }),
      );
    });

    it('should not publish event when stock is above threshold', async () => {
      const ingredient = createIngredient({
        quantity: 30,
        lowStockThreshold: 10,
      });
      vi.mocked(repo.findById).mockResolvedValue(createIngredient({ quantity: 50 }));
      vi.mocked(repo.adjustStock).mockResolvedValue(ingredient);

      await service.adjustStock({
        ingredientId: 'ing-1',
        type: 'usage',
        quantity: 20,
      });

      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('should publish event when stock equals threshold exactly', async () => {
      const ingredient = createIngredient({
        quantity: 10,
        lowStockThreshold: 10,
      });
      vi.mocked(repo.findById).mockResolvedValue(createIngredient({ quantity: 20 }));
      vi.mocked(repo.adjustStock).mockResolvedValue(ingredient);

      await service.adjustStock({
        ingredientId: 'ing-1',
        type: 'usage',
        quantity: 10,
      });

      expect(eventBus.publish).toHaveBeenCalledOnce();
    });
  });

  describe('getById', () => {
    it('should return ingredient when found', async () => {
      const ingredient = createIngredient();
      vi.mocked(repo.findById).mockResolvedValue(ingredient);

      const result = await service.getById('ing-1');
      expect(result).toEqual(ingredient);
    });

    it('should throw NotFoundError when ingredient not found', async () => {
      vi.mocked(repo.findById).mockResolvedValue(null);

      await expect(service.getById('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getAll', () => {
    it('should return all ingredients', async () => {
      const ingredients = [createIngredient({ id: 'i1' }), createIngredient({ id: 'i2' })];
      vi.mocked(repo.findAll).mockResolvedValue(ingredients);

      const result = await service.getAll();
      expect(result).toHaveLength(2);
    });

    it('should pass search parameter to repository', async () => {
      vi.mocked(repo.findAll).mockResolvedValue([]);

      await service.getAll('flour');
      expect(repo.findAll).toHaveBeenCalledWith('flour');
    });
  });

  describe('getLowStock', () => {
    it('should return low stock ingredients', async () => {
      const lowStock = [createIngredient({ quantity: 3, lowStockThreshold: 10 })];
      vi.mocked(repo.findLowStock).mockResolvedValue(lowStock);

      const result = await service.getLowStock();
      expect(result).toHaveLength(1);
    });
  });
});
