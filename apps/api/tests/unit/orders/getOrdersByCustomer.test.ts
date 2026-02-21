import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderService } from '../../../src/modules/orders/order.service.js';
import { createOrder } from '../helpers/mock-factories.js';

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
  },
}));

vi.mock('../../../src/core/events/event-bus.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../src/core/events/event-bus.js')>();
  return { ...original, getEventBus: vi.fn().mockReturnValue({ publish: vi.fn() }) };
});

vi.mock('../../../src/modules/orders/use-cases/updateOrderStatus.js', () => ({
  UpdateOrderStatusUseCase: vi.fn().mockImplementation(() => ({
    execute: vi.fn(),
  })),
}));

vi.mock('../../../src/modules/shared/unitConversion.js', () => ({
  unitConversionFactor: vi.fn().mockReturnValue(1),
}));

vi.mock('@mise/shared/src/constants/index.js', () => ({
  ORDER_STATUS_FLOW: {
    0: [1],
    1: [0, 2],
    2: [1, 3],
    3: [2],
  },
}));

import { OrderCrud } from '../../../src/modules/orders/orderCrud.js';

const STORE_ID = 1;

describe('OrderService.getByCustomerId', () => {
  let service: OrderService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new OrderService();
  });

  it('should return orders for a customer', async () => {
    const orders = [
      createOrder({ id: 1, customerId: 1 }),
      createOrder({ id: 2, customerId: 1 }),
    ];
    vi.mocked(OrderCrud.findByCustomerId).mockResolvedValue({ orders, total: 2 });

    const result = await service.getByCustomerId(STORE_ID, 1);

    expect(result.orders).toHaveLength(2);
    expect(OrderCrud.findByCustomerId).toHaveBeenCalledWith(STORE_ID, 1, undefined, undefined);
  });

  it('should return empty array when customer has no orders', async () => {
    vi.mocked(OrderCrud.findByCustomerId).mockResolvedValue({ orders: [], total: 0 });

    const result = await service.getByCustomerId(STORE_ID, 999);

    expect(result.orders).toEqual([]);
  });
});
