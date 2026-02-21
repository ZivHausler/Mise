import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderService } from '../../../src/modules/orders/order.service.js';
import { createMockEventBus, createOrder } from '../helpers/mock-factories.js';
import { ValidationError } from '../../../src/core/errors/app-error.js';
import type { EventBus } from '../../../src/core/events/event-bus.js';

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

describe('OrderService.createBatch', () => {
  let service: OrderService;
  let eventBus: EventBus;
  let createCallCount: number;

  beforeEach(() => {
    vi.clearAllMocks();
    eventBus = createMockEventBus();
    vi.mocked(getEventBus).mockReturnValue(eventBus);
    service = new OrderService();
    createCallCount = 0;

    vi.mocked(OrderCrud.create).mockImplementation(async (_storeId, data) => {
      createCallCount++;
      return createOrder({
        id: `order-${createCallCount}`,
        customerId: data.customerId,
        dueDate: data.dueDate,
        recurringGroupId: (data as any).recurringGroupId,
      });
    });
  });

  it('should create orders for each matching day in the range', async () => {
    // Monday 2025-01-06 to Friday 2025-01-10, selecting Mon(1) and Wed(3)
    const orders = await service.createBatch(
      STORE_ID,
      { customerId: 'cust-1', items: [{ recipeId: 'r1', quantity: 1 }], dueDate: new Date('2025-01-06') },
      { frequency: 'weekly', daysOfWeek: [1, 3], endDate: '2025-01-17' },
    );

    // Mon 6, Wed 8, Mon 13, Wed 15 = 4 orders
    expect(orders).toHaveLength(4);
    expect(OrderCrud.create).toHaveBeenCalledTimes(4);
  });

  it('should assign the same recurringGroupId to all orders', async () => {
    await service.createBatch(
      STORE_ID,
      { customerId: 'cust-1', items: [{ recipeId: 'r1', quantity: 1 }], dueDate: new Date('2025-01-06') },
      { frequency: 'weekly', daysOfWeek: [1], endDate: '2025-01-13' },
    );

    const calls = vi.mocked(OrderCrud.create).mock.calls;
    const groupIds = calls.map((c) => (c[1] as any).recurringGroupId);
    expect(groupIds[0]).toBeDefined();
    expect(new Set(groupIds).size).toBe(1);
  });

  it('should throw ValidationError when no occurrences match', async () => {
    // Range is Mon-Fri but we select Saturday(6) only
    await expect(
      service.createBatch(
        STORE_ID,
        { customerId: 'cust-1', items: [{ recipeId: 'r1', quantity: 1 }], dueDate: new Date('2025-01-06') },
        { frequency: 'weekly', daysOfWeek: [6], endDate: '2025-01-10' },
      ),
    ).rejects.toThrow(ValidationError);
  });

  it('should cap occurrences at MAX_RECURRING_OCCURRENCES (52)', async () => {
    // Select every day for a 2-year range — should cap at 52
    const orders = await service.createBatch(
      STORE_ID,
      { customerId: 'cust-1', items: [{ recipeId: 'r1', quantity: 1 }], dueDate: new Date('2025-01-01') },
      { frequency: 'weekly', daysOfWeek: [0, 1, 2, 3, 4, 5, 6], endDate: '2026-12-31' },
    );

    expect(orders).toHaveLength(52);
  });

  it('should publish an event for each created order', async () => {
    await service.createBatch(
      STORE_ID,
      { customerId: 'cust-1', items: [{ recipeId: 'r1', quantity: 1 }], dueDate: new Date('2025-01-06') },
      { frequency: 'weekly', daysOfWeek: [1], endDate: '2025-01-13' },
    );

    // Mon 6, Mon 13 = 2 orders
    expect(eventBus.publish).toHaveBeenCalledTimes(2);
  });

  it('should use current date as start when dueDate is not provided', async () => {
    // This tests the fallback branch — can't assert exact dates but should not throw
    vi.mocked(OrderCrud.create).mockResolvedValue(createOrder());

    // Use today + select all days so there's at least one match
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);
    const endDateStr = endDate.toISOString().split('T')[0]!;

    const orders = await service.createBatch(
      STORE_ID,
      { customerId: 'cust-1', items: [{ recipeId: 'r1', quantity: 1 }] },
      { frequency: 'weekly', daysOfWeek: [0, 1, 2, 3, 4, 5, 6], endDate: endDateStr },
    );

    expect(orders.length).toBeGreaterThan(0);
  });
});
