import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderService } from '../../../src/modules/orders/order.service.js';
import { createMockEventBus, createOrder, createRecipe, createIngredient } from '../helpers/mock-factories.js';
import { ORDER_STATUS } from '../../../src/modules/orders/order.types.js';
import { InventoryLogType } from '@mise/shared';

vi.mock('../../../src/core/events/event-bus.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../src/core/events/event-bus.js')>();
  return { ...original, getEventBus: vi.fn() };
});

vi.mock('@mise/shared/src/constants/index.js', () => ({
  ORDER_STATUS_FLOW: {
    0: [1],
    1: [0, 2],
    2: [1, 3],
    3: [2],
  },
  MAX_RECURRING_OCCURRENCES: 52,
}));

vi.mock('../../../src/modules/orders/orderCrud.js', () => ({
  OrderCrud: {
    getById: vi.fn(),
    updateStatus: vi.fn(),
  },
}));

vi.mock('../../../src/modules/shared/unitConversion.js', () => ({
  unitConversionFactor: vi.fn().mockReturnValue(1),
}));

vi.mock('../../../src/core/events/event-names.js', () => ({
  EventNames: {
    ORDER_CREATED: 'order.created',
    INVENTORY_LOW_STOCK: 'inventory.lowStock',
  },
}));

import { OrderCrud } from '../../../src/modules/orders/orderCrud.js';
import { getEventBus } from '../../../src/core/events/event-bus.js';
import { unitConversionFactor } from '../../../src/modules/shared/unitConversion.js';

const STORE_ID = 1;

describe('OrderService – inventory deduction on status change', () => {
  let service: OrderService;
  let mockRecipeService: { getById: ReturnType<typeof vi.fn> };
  let mockInventoryService: { getById: ReturnType<typeof vi.fn>; adjustStock: ReturnType<typeof vi.fn> };

  const recipe = createRecipe({
    id: 'recipe-1',
    ingredients: [
      { ingredientId: '1', name: 'Flour', quantity: 2, unit: 'kg', costPerUnit: 3.5 },
      { ingredientId: '2', name: 'Sugar', quantity: 1, unit: 'kg', costPerUnit: 5 },
    ],
  });

  const order = createOrder({
    status: ORDER_STATUS.IN_PROGRESS,
    items: [{ recipeId: 'recipe-1', quantity: 3, unitPrice: 50 }],
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getEventBus).mockReturnValue(createMockEventBus());

    mockRecipeService = { getById: vi.fn().mockResolvedValue(recipe) };
    mockInventoryService = {
      getById: vi.fn().mockImplementation((_storeId: number, id: number) => {
        if (id === 1) return Promise.resolve(createIngredient({ id: 1, unit: 'kg' }));
        if (id === 2) return Promise.resolve(createIngredient({ id: 2, name: 'Sugar', unit: 'kg' }));
        throw new Error('Not found');
      }),
      adjustStock: vi.fn().mockResolvedValue(undefined),
    };

    service = new OrderService(mockRecipeService as any, mockInventoryService as any);
  });

  it('should deduct inventory when advancing from in_progress to ready', async () => {
    vi.mocked(OrderCrud.getById).mockResolvedValue(order);
    vi.mocked(OrderCrud.updateStatus).mockResolvedValue(createOrder({ status: ORDER_STATUS.READY, items: order.items }));

    await service.updateStatus(STORE_ID, 1, ORDER_STATUS.READY);

    // Recipe has 2kg flour + 1kg sugar, order has 3 units → 6kg flour, 3kg sugar
    expect(mockInventoryService.adjustStock).toHaveBeenCalledTimes(2);
    expect(mockInventoryService.adjustStock).toHaveBeenCalledWith(STORE_ID, {
      ingredientId: 1,
      type: InventoryLogType.USAGE,
      quantity: 6, // 2kg * 3 units
      reason: expect.stringContaining('Order'),
    }, undefined, { suppressEvent: true });
    expect(mockInventoryService.adjustStock).toHaveBeenCalledWith(STORE_ID, {
      ingredientId: 2,
      type: InventoryLogType.USAGE,
      quantity: 3, // 1kg * 3 units
      reason: expect.stringContaining('Order'),
    }, undefined, { suppressEvent: true });
  });

  it('should restore inventory when reverting from ready to in_progress', async () => {
    const readyOrder = createOrder({
      status: ORDER_STATUS.READY,
      items: [{ recipeId: 'recipe-1', quantity: 3, unitPrice: 50 }],
    });
    vi.mocked(OrderCrud.getById).mockResolvedValue(readyOrder);
    vi.mocked(OrderCrud.updateStatus).mockResolvedValue(createOrder({ status: ORDER_STATUS.IN_PROGRESS, items: readyOrder.items }));

    await service.updateStatus(STORE_ID, 1, ORDER_STATUS.IN_PROGRESS);

    expect(mockInventoryService.adjustStock).toHaveBeenCalledTimes(2);
    expect(mockInventoryService.adjustStock).toHaveBeenCalledWith(STORE_ID, {
      ingredientId: 1,
      type: InventoryLogType.ADDITION,
      quantity: 6,
      reason: expect.stringContaining('Order'),
    }, undefined, { suppressEvent: true });
    expect(mockInventoryService.adjustStock).toHaveBeenCalledWith(STORE_ID, {
      ingredientId: 2,
      type: InventoryLogType.ADDITION,
      quantity: 3,
      reason: expect.stringContaining('Order'),
    }, undefined, { suppressEvent: true });
  });

  it('should NOT adjust inventory for other status transitions', async () => {
    const receivedOrder = createOrder({ status: ORDER_STATUS.RECEIVED });
    vi.mocked(OrderCrud.getById).mockResolvedValue(receivedOrder);
    vi.mocked(OrderCrud.updateStatus).mockResolvedValue(createOrder({ status: ORDER_STATUS.IN_PROGRESS }));

    await service.updateStatus(STORE_ID, 1, ORDER_STATUS.IN_PROGRESS);

    expect(mockInventoryService.adjustStock).not.toHaveBeenCalled();
  });

  it('should apply unit conversion factor when ingredient units differ', async () => {
    vi.mocked(unitConversionFactor).mockReturnValue(1000); // e.g. kg → g
    vi.mocked(OrderCrud.getById).mockResolvedValue(order);
    vi.mocked(OrderCrud.updateStatus).mockResolvedValue(createOrder({ status: ORDER_STATUS.READY, items: order.items }));

    await service.updateStatus(STORE_ID, 1, ORDER_STATUS.READY);

    // 2 (recipe qty) * 1000 (factor) * 3 (order qty) = 6000
    expect(mockInventoryService.adjustStock).toHaveBeenCalledWith(STORE_ID, expect.objectContaining({
      ingredientId: 1,
      quantity: 6000,
    }), undefined, { suppressEvent: true });
  });

  it('should skip ingredients not found in inventory', async () => {
    mockInventoryService.getById.mockImplementation((_storeId: number, id: number) => {
      if (id === 1) return Promise.resolve(createIngredient({ id: 1, unit: 'kg' }));
      throw new Error('Not found');
    });

    vi.mocked(OrderCrud.getById).mockResolvedValue(order);
    vi.mocked(OrderCrud.updateStatus).mockResolvedValue(createOrder({ status: ORDER_STATUS.READY, items: order.items }));

    await service.updateStatus(STORE_ID, 1, ORDER_STATUS.READY);

    // Only flour should be deducted, sugar skipped
    expect(mockInventoryService.adjustStock).toHaveBeenCalledTimes(1);
    expect(mockInventoryService.adjustStock).toHaveBeenCalledWith(STORE_ID, expect.objectContaining({
      ingredientId: 1,
    }), undefined, { suppressEvent: true });
  });

  it('should skip recipes not found', async () => {
    mockRecipeService.getById.mockRejectedValue(new Error('Recipe not found'));

    vi.mocked(OrderCrud.getById).mockResolvedValue(order);
    vi.mocked(OrderCrud.updateStatus).mockResolvedValue(createOrder({ status: ORDER_STATUS.READY, items: order.items }));

    await service.updateStatus(STORE_ID, 1, ORDER_STATUS.READY);

    expect(mockInventoryService.adjustStock).not.toHaveBeenCalled();
  });

  it('should publish a single batched INVENTORY_LOW_STOCK event for all low-stock ingredients', async () => {
    const lowFlour = createIngredient({ id: 1, name: 'Flour', quantity: 2, lowStockThreshold: 10, unit: 'kg' });
    const lowSugar = createIngredient({ id: 2, name: 'Sugar', quantity: 1, lowStockThreshold: 5, unit: 'kg' });

    mockInventoryService.adjustStock
      .mockResolvedValueOnce(lowFlour)
      .mockResolvedValueOnce(lowSugar);

    vi.mocked(OrderCrud.getById).mockResolvedValue(order);
    vi.mocked(OrderCrud.updateStatus).mockResolvedValue(createOrder({ status: ORDER_STATUS.READY, items: order.items }));

    await service.updateStatus(STORE_ID, 1, ORDER_STATUS.READY);

    const mockEventBus = vi.mocked(getEventBus)();
    // Should publish ORDER_STATUS_CHANGED (from updateOrderStatusUseCase) + 1 batched low-stock event
    const lowStockCalls = vi.mocked(mockEventBus.publish).mock.calls.filter(
      (call) => call[0].eventName === 'inventory.lowStock',
    );
    expect(lowStockCalls).toHaveLength(1);
    expect(lowStockCalls[0][0].payload).toEqual({
      items: [
        { ingredientId: 1, name: 'Flour', currentQuantity: 2, threshold: 10, unit: 'kg' },
        { ingredientId: 2, name: 'Sugar', currentQuantity: 1, threshold: 5, unit: 'kg' },
      ],
    });
  });

  it('should not publish low-stock event when no ingredients are below threshold', async () => {
    const okFlour = createIngredient({ id: 1, name: 'Flour', quantity: 30, lowStockThreshold: 10, unit: 'kg' });
    const okSugar = createIngredient({ id: 2, name: 'Sugar', quantity: 20, lowStockThreshold: 5, unit: 'kg' });

    mockInventoryService.adjustStock
      .mockResolvedValueOnce(okFlour)
      .mockResolvedValueOnce(okSugar);

    vi.mocked(OrderCrud.getById).mockResolvedValue(order);
    vi.mocked(OrderCrud.updateStatus).mockResolvedValue(createOrder({ status: ORDER_STATUS.READY, items: order.items }));

    await service.updateStatus(STORE_ID, 1, ORDER_STATUS.READY);

    const mockEventBus = vi.mocked(getEventBus)();
    const lowStockCalls = vi.mocked(mockEventBus.publish).mock.calls.filter(
      (call) => call[0].eventName === 'inventory.lowStock',
    );
    expect(lowStockCalls).toHaveLength(0);
  });
});
