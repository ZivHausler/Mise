import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdjustStockUseCase } from '../../../src/modules/inventory/use-cases/adjustStock.js';
import { createIngredient } from '../helpers/mock-factories.js';
import { NotFoundError, ValidationError } from '../../../src/core/errors/app-error.js';
import { InventoryLogType } from '@mise/shared';

vi.mock('../../../src/modules/inventory/inventoryCrud.js', () => ({
  InventoryCrud: {
    getById: vi.fn(),
    adjustStock: vi.fn(),
  },
}));

const mockPublish = vi.fn();
vi.mock('../../../src/core/events/event-bus.js', () => ({
  getEventBus: () => ({
    publish: mockPublish,
  }),
}));

vi.mock('../../../src/core/events/event-names.js', () => ({
  EventNames: {
    INVENTORY_LOW_STOCK: 'inventory.low_stock',
  },
}));

import { InventoryCrud } from '../../../src/modules/inventory/inventoryCrud.js';

const STORE_ID = 1;

describe('AdjustStockUseCase', () => {
  let useCase: AdjustStockUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new AdjustStockUseCase();
  });

  it('should adjust stock with addition type', async () => {
    const ingredient = createIngredient({ quantity: 50 });
    const updated = createIngredient({ quantity: 60 });
    vi.mocked(InventoryCrud.getById).mockResolvedValue(ingredient);
    vi.mocked(InventoryCrud.adjustStock).mockResolvedValue(updated);

    const result = await useCase.execute(STORE_ID, {
      ingredientId: 1,
      type: InventoryLogType.ADDITION,
      quantity: 10,
    });

    expect(result.quantity).toBe(60);
    expect(InventoryCrud.adjustStock).toHaveBeenCalledOnce();
  });

  it('should adjust stock with usage type', async () => {
    const ingredient = createIngredient({ quantity: 50 });
    const updated = createIngredient({ quantity: 40 });
    vi.mocked(InventoryCrud.getById).mockResolvedValue(ingredient);
    vi.mocked(InventoryCrud.adjustStock).mockResolvedValue(updated);

    const result = await useCase.execute(STORE_ID, {
      ingredientId: 1,
      type: InventoryLogType.USAGE,
      quantity: 10,
    });

    expect(result.quantity).toBe(40);
  });

  it('should throw ValidationError when quantity is zero', async () => {
    vi.mocked(InventoryCrud.getById).mockResolvedValue(createIngredient());

    await expect(
      useCase.execute(STORE_ID, { ingredientId: 1, type: InventoryLogType.ADDITION, quantity: 0 }),
    ).rejects.toThrow('Adjustment quantity must be positive');
  });

  it('should throw ValidationError when quantity is negative', async () => {
    vi.mocked(InventoryCrud.getById).mockResolvedValue(createIngredient());

    await expect(
      useCase.execute(STORE_ID, { ingredientId: 1, type: InventoryLogType.ADDITION, quantity: -5 }),
    ).rejects.toThrow('Adjustment quantity must be positive');
  });

  it('should throw NotFoundError when ingredient does not exist', async () => {
    vi.mocked(InventoryCrud.getById).mockResolvedValue(null);

    await expect(
      useCase.execute(STORE_ID, { ingredientId: 999, type: InventoryLogType.ADDITION, quantity: 10 }),
    ).rejects.toThrow(NotFoundError);
  });

  it('should allow adjustment type', async () => {
    const ingredient = createIngredient({ quantity: 50 });
    const updated = createIngredient({ quantity: 55 });
    vi.mocked(InventoryCrud.getById).mockResolvedValue(ingredient);
    vi.mocked(InventoryCrud.adjustStock).mockResolvedValue(updated);

    const result = await useCase.execute(STORE_ID, {
      ingredientId: 1,
      type: InventoryLogType.ADJUSTMENT,
      quantity: 5,
    });

    expect(result.quantity).toBe(55);
  });

  it('should publish low stock event when quantity drops below threshold', async () => {
    const ingredient = createIngredient({ quantity: 50 });
    const updated = createIngredient({ quantity: 3, lowStockThreshold: 10, id: 1, name: 'Flour' });
    vi.mocked(InventoryCrud.getById).mockResolvedValue(ingredient);
    vi.mocked(InventoryCrud.adjustStock).mockResolvedValue(updated);

    await useCase.execute(STORE_ID, {
      ingredientId: 1,
      type: InventoryLogType.USAGE,
      quantity: 47,
    });

    expect(mockPublish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'inventory.low_stock',
        payload: {
          items: [expect.objectContaining({
            ingredientId: updated.id,
            name: updated.name,
            currentQuantity: 3,
            threshold: 10,
            unit: updated.unit,
          })],
        },
      }),
    );
  });

  it('should not publish low stock event when quantity is above threshold', async () => {
    const ingredient = createIngredient({ quantity: 50 });
    const updated = createIngredient({ quantity: 30, lowStockThreshold: 10 });
    vi.mocked(InventoryCrud.getById).mockResolvedValue(ingredient);
    vi.mocked(InventoryCrud.adjustStock).mockResolvedValue(updated);

    await useCase.execute(STORE_ID, {
      ingredientId: 1,
      type: InventoryLogType.USAGE,
      quantity: 20,
    });

    expect(mockPublish).not.toHaveBeenCalled();
  });

  it('should skip event when suppressEvent option is true', async () => {
    const ingredient = createIngredient({ quantity: 50 });
    const updated = createIngredient({ quantity: 3, lowStockThreshold: 10, id: 1, name: 'Flour' });
    vi.mocked(InventoryCrud.getById).mockResolvedValue(ingredient);
    vi.mocked(InventoryCrud.adjustStock).mockResolvedValue(updated);

    const result = await useCase.execute(STORE_ID, {
      ingredientId: 1,
      type: InventoryLogType.USAGE,
      quantity: 47,
    }, undefined, { suppressEvent: true });

    expect(result.quantity).toBe(3);
    expect(mockPublish).not.toHaveBeenCalled();
  });
});
