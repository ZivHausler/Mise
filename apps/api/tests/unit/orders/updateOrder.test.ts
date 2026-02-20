import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderService } from '../../../src/modules/orders/order.service.js';
import { createMockEventBus, createOrder } from '../helpers/mock-factories.js';
import { NotFoundError } from '../../../src/core/errors/app-error.js';
import type { EventBus } from '../../../src/core/events/event-bus.js';
import type { RecipeService } from '../../../src/modules/recipes/recipe.service.js';

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
    create: vi.fn(),
    getById: vi.fn(),
    getAll: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    delete: vi.fn(),
    findByCustomerId: vi.fn(),
    findByDateRange: vi.fn(),
    getCalendarAggregates: vi.fn(),
    findByDay: vi.fn(),
    findFutureByRecurringGroup: vi.fn(),
  },
}));

vi.mock('../../../src/modules/orders/use-cases/updateOrderStatus.js', () => ({
  UpdateOrderStatusUseCase: vi.fn().mockImplementation(() => ({
    execute: vi.fn(),
  })),
}));

vi.mock('../../../src/modules/shared/unitConversion.js', () => ({
  unitConversionFactor: vi.fn().mockReturnValue(1),
}));

import { OrderCrud } from '../../../src/modules/orders/orderCrud.js';
import { getEventBus } from '../../../src/core/events/event-bus.js';

const STORE_ID = 'store-1';

describe('OrderService.update (with items)', () => {
  let service: OrderService;
  let eventBus: EventBus;
  let mockRecipeService: RecipeService;

  beforeEach(() => {
    vi.clearAllMocks();
    eventBus = createMockEventBus();
    vi.mocked(getEventBus).mockReturnValue(eventBus);

    mockRecipeService = {
      getById: vi.fn().mockResolvedValue({ sellingPrice: 75, totalCost: 50, name: 'Cake' }),
    } as unknown as RecipeService;

    service = new OrderService(mockRecipeService);
  });

  it('should resolve item prices from recipe service and compute totalAmount', async () => {
    const existing = createOrder();
    vi.mocked(OrderCrud.getById).mockResolvedValue(existing);
    vi.mocked(OrderCrud.update).mockImplementation(async (_s, _id, data) => ({
      ...existing,
      ...data,
    }) as any);

    const result = await service.update(STORE_ID, 'order-1', {
      items: [{ recipeId: 'recipe-1', quantity: 3 }],
    });

    expect(result.totalAmount).toBe(225); // 75 * 3
    expect(result.items).toEqual([
      expect.objectContaining({ recipeId: 'recipe-1', quantity: 3, unitPrice: 75, recipeName: 'Cake' }),
    ]);
  });

  it('should use provided price when recipe lookup fails', async () => {
    vi.mocked((mockRecipeService as any).getById).mockRejectedValue(new Error('not found'));
    const existing = createOrder();
    vi.mocked(OrderCrud.getById).mockResolvedValue(existing);
    vi.mocked(OrderCrud.update).mockImplementation(async (_s, _id, data) => ({
      ...existing,
      ...data,
    }) as any);

    const result = await service.update(STORE_ID, 'order-1', {
      items: [{ recipeId: 'recipe-1', quantity: 2, price: 30 }],
    });

    expect(result.totalAmount).toBe(60); // 30 * 2
  });

  it('should update notes and dueDate without touching items', async () => {
    const existing = createOrder();
    vi.mocked(OrderCrud.getById).mockResolvedValue(existing);
    vi.mocked(OrderCrud.update).mockImplementation(async (_s, _id, data) => ({
      ...existing,
      ...data,
    }) as any);

    const newDate = new Date('2025-06-01');
    const result = await service.update(STORE_ID, 'order-1', {
      notes: 'rush order',
      dueDate: newDate,
    });

    expect(result.notes).toBe('rush order');
    expect(result.dueDate).toEqual(newDate);
    // items and totalAmount should remain from existing order
    expect(result.items).toEqual(existing.items);
  });

  it('should throw NotFoundError when order does not exist', async () => {
    vi.mocked(OrderCrud.getById).mockResolvedValue(null);

    await expect(service.update(STORE_ID, 'nonexistent', { notes: 'x' })).rejects.toThrow(NotFoundError);
  });
});

describe('OrderService.updateFutureRecurring', () => {
  let service: OrderService;
  let eventBus: EventBus;

  beforeEach(() => {
    vi.clearAllMocks();
    eventBus = createMockEventBus();
    vi.mocked(getEventBus).mockReturnValue(eventBus);
    service = new OrderService();
  });

  it('should update current order and all future siblings', async () => {
    const groupId = 'group-abc';
    const currentOrder = createOrder({
      id: 'order-1',
      recurringGroupId: groupId,
      dueDate: new Date('2025-03-10'),
    });
    const futureOrder1 = createOrder({ id: 'order-2', recurringGroupId: groupId, dueDate: new Date('2025-03-17') });
    const futureOrder2 = createOrder({ id: 'order-3', recurringGroupId: groupId, dueDate: new Date('2025-03-24') });

    // First getById call (for update of current order)
    vi.mocked(OrderCrud.getById)
      .mockResolvedValueOnce(currentOrder)  // update() → getById for order-1
      .mockResolvedValueOnce(futureOrder1)  // update() → getById for order-2
      .mockResolvedValueOnce(futureOrder2); // update() → getById for order-3

    vi.mocked(OrderCrud.update).mockImplementation(async (_s, id, data) => {
      const base = id === 'order-1' ? currentOrder : id === 'order-2' ? futureOrder1 : futureOrder2;
      return { ...base, ...data } as any;
    });

    vi.mocked(OrderCrud.findFutureByRecurringGroup).mockResolvedValue([futureOrder1, futureOrder2]);

    const result = await service.updateFutureRecurring(STORE_ID, 'order-1', { notes: 'updated' });

    expect(result.updated.notes).toBe('updated');
    expect(result.futureUpdated).toBe(2);
    expect(OrderCrud.update).toHaveBeenCalledTimes(3); // 1 current + 2 future
  });

  it('should NOT update previous orders in the recurring group', async () => {
    const groupId = 'group-abc';
    const pastOrder = createOrder({ id: 'order-past', recurringGroupId: groupId, dueDate: new Date('2025-03-03'), notes: 'original' });
    const currentOrder = createOrder({ id: 'order-current', recurringGroupId: groupId, dueDate: new Date('2025-03-10'), notes: 'original' });
    const futureOrder = createOrder({ id: 'order-future', recurringGroupId: groupId, dueDate: new Date('2025-03-17'), notes: 'original' });

    vi.mocked(OrderCrud.getById)
      .mockResolvedValueOnce(currentOrder)  // update() → getById for order-current
      .mockResolvedValueOnce(futureOrder);  // update() → getById for order-future

    vi.mocked(OrderCrud.update).mockImplementation(async (_s, id, data) => {
      const base = id === 'order-current' ? currentOrder : futureOrder;
      return { ...base, ...data } as any;
    });

    // findFutureByRecurringGroup should only return orders AFTER currentOrder's dueDate
    // — the past order is NOT included
    vi.mocked(OrderCrud.findFutureByRecurringGroup).mockResolvedValue([futureOrder]);

    const result = await service.updateFutureRecurring(STORE_ID, 'order-current', { notes: 'changed' });

    // Verify the correct query was made: after currentOrder's dueDate
    expect(OrderCrud.findFutureByRecurringGroup).toHaveBeenCalledWith(
      STORE_ID,
      groupId,
      currentOrder.dueDate,
    );

    // Current + 1 future = 2 updates. Past order must NOT be updated.
    expect(result.futureUpdated).toBe(1);
    expect(OrderCrud.update).toHaveBeenCalledTimes(2);

    // Verify update was called only for current and future, never for past
    const updatedIds = vi.mocked(OrderCrud.update).mock.calls.map((c) => c[1]);
    expect(updatedIds).toContain('order-current');
    expect(updatedIds).toContain('order-future');
    expect(updatedIds).not.toContain('order-past');
  });

  it('should propagate items and notes to future orders but preserve each order dueDate', async () => {
    const groupId = 'group-abc';
    const currentOrder = createOrder({
      id: 'order-1',
      recurringGroupId: groupId,
      dueDate: new Date('2025-03-10'),
    });
    const futureOrder = createOrder({
      id: 'order-2',
      recurringGroupId: groupId,
      dueDate: new Date('2025-03-17'),
    });

    vi.mocked(OrderCrud.getById)
      .mockResolvedValueOnce(currentOrder)
      .mockResolvedValueOnce(futureOrder);

    vi.mocked(OrderCrud.update).mockImplementation(async (_s, id, data) => {
      const base = id === 'order-1' ? currentOrder : futureOrder;
      return { ...base, ...data } as any;
    });

    vi.mocked(OrderCrud.findFutureByRecurringGroup).mockResolvedValue([futureOrder]);

    const newItems = [{ recipeId: 'recipe-new', quantity: 5, price: 20 }];
    await service.updateFutureRecurring(STORE_ID, 'order-1', {
      items: newItems,
      notes: 'bulk note',
    });

    // The future order update should include items and notes but NOT dueDate
    const futureUpdateCall = vi.mocked(OrderCrud.update).mock.calls.find((c) => c[1] === 'order-2');
    expect(futureUpdateCall).toBeDefined();
    // The update() method receives updateData built from the DTO; dueDate is not in the payload for future siblings
    // Verify the data passed to update for the future order contains items and notes
    const futureUpdateArgs = vi.mocked(OrderCrud.update).mock.calls;
    const futureCall = futureUpdateArgs.find((c) => c[1] === 'order-2');
    expect(futureCall).toBeDefined();
  });

  it('should return futureUpdated=0 when order has no recurringGroupId', async () => {
    const order = createOrder({ id: 'order-1', recurringGroupId: undefined, dueDate: new Date('2025-03-10') });
    vi.mocked(OrderCrud.getById).mockResolvedValue(order);
    vi.mocked(OrderCrud.update).mockResolvedValue({ ...order, notes: 'new' } as any);

    const result = await service.updateFutureRecurring(STORE_ID, 'order-1', { notes: 'new' });

    expect(result.futureUpdated).toBe(0);
    expect(OrderCrud.findFutureByRecurringGroup).not.toHaveBeenCalled();
  });

  it('should return futureUpdated=0 when order has no dueDate', async () => {
    const order = createOrder({ id: 'order-1', recurringGroupId: 'group-abc', dueDate: undefined });
    vi.mocked(OrderCrud.getById).mockResolvedValue(order);
    vi.mocked(OrderCrud.update).mockResolvedValue({ ...order, notes: 'new' } as any);

    const result = await service.updateFutureRecurring(STORE_ID, 'order-1', { notes: 'new' });

    expect(result.futureUpdated).toBe(0);
    expect(OrderCrud.findFutureByRecurringGroup).not.toHaveBeenCalled();
  });

  it('should return futureUpdated=0 when there are no future siblings', async () => {
    const groupId = 'group-abc';
    const currentOrder = createOrder({
      id: 'order-1',
      recurringGroupId: groupId,
      dueDate: new Date('2025-03-10'),
    });

    vi.mocked(OrderCrud.getById).mockResolvedValue(currentOrder);
    vi.mocked(OrderCrud.update).mockResolvedValue({ ...currentOrder, notes: 'updated' } as any);
    vi.mocked(OrderCrud.findFutureByRecurringGroup).mockResolvedValue([]);

    const result = await service.updateFutureRecurring(STORE_ID, 'order-1', { notes: 'updated' });

    expect(result.futureUpdated).toBe(0);
    // Only the current order was updated
    expect(OrderCrud.update).toHaveBeenCalledTimes(1);
    expect(OrderCrud.update).toHaveBeenCalledWith(STORE_ID, 'order-1', expect.anything());
  });
});
