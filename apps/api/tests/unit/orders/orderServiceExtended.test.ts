import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderService } from '../../../src/modules/orders/order.service.js';
import { createMockEventBus, createOrder } from '../helpers/mock-factories.js';
import { NotFoundError, ValidationError } from '../../../src/core/errors/app-error.js';
import { ORDER_STATUS } from '../../../src/modules/orders/order.types.js';
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

describe('OrderService - extended', () => {
  let service: OrderService;
  let eventBus: EventBus;

  beforeEach(() => {
    vi.clearAllMocks();
    eventBus = createMockEventBus();
    vi.mocked(getEventBus).mockReturnValue(eventBus);
    service = new OrderService();
  });

  describe('getAll', () => {
    it('should return all orders', async () => {
      const orders = [createOrder({ id: 'o1' }), createOrder({ id: 'o2' })];
      vi.mocked(OrderCrud.getAll).mockResolvedValue(orders);

      const result = await service.getAll(STORE_ID);
      expect(result).toHaveLength(2);
    });

    it('should pass status filter', async () => {
      vi.mocked(OrderCrud.getAll).mockResolvedValue([]);

      await service.getAll(STORE_ID, { status: ORDER_STATUS.RECEIVED });
      expect(OrderCrud.getAll).toHaveBeenCalledWith(STORE_ID, { status: ORDER_STATUS.RECEIVED });
    });
  });

  describe('getByCustomerId', () => {
    it('should return orders for a customer', async () => {
      const result = { orders: [createOrder()], total: 1 };
      vi.mocked(OrderCrud.findByCustomerId).mockResolvedValue(result);

      const res = await service.getByCustomerId(STORE_ID, 'cust-1', { limit: 10, offset: 0 });
      expect(res.orders).toHaveLength(1);
      expect(res.total).toBe(1);
    });
  });

  describe('getByDateRange', () => {
    it('should return orders in date range', async () => {
      const orders = [createOrder()];
      vi.mocked(OrderCrud.findByDateRange).mockResolvedValue(orders);

      const result = await service.getByDateRange(STORE_ID, { from: '2025-01-01', to: '2025-01-31' });
      expect(result).toHaveLength(1);
      expect(OrderCrud.findByDateRange).toHaveBeenCalledWith(STORE_ID, { from: '2025-01-01', to: '2025-01-31' });
    });
  });

  describe('getCalendarAggregates', () => {
    it('should return calendar aggregates', async () => {
      const aggregates = [{ day: '2025-01-01', total: 5, received: 2, inProgress: 1, ready: 1, delivered: 1 }];
      vi.mocked(OrderCrud.getCalendarAggregates).mockResolvedValue(aggregates);

      const result = await service.getCalendarAggregates(STORE_ID, { from: '2025-01-01', to: '2025-01-31' });
      expect(result).toEqual(aggregates);
    });
  });

  describe('getByDay', () => {
    it('should return orders for a specific day', async () => {
      const result = { orders: [createOrder()], total: 1 };
      vi.mocked(OrderCrud.findByDay).mockResolvedValue(result);

      const res = await service.getByDay(STORE_ID, { date: '2025-01-15', limit: 10, offset: 0 });
      expect(res.orders).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('should update an existing order', async () => {
      const order = createOrder();
      vi.mocked(OrderCrud.getById).mockResolvedValue(order);
      vi.mocked(OrderCrud.update).mockResolvedValue({ ...order, totalAmount: 200 });

      const result = await service.update(STORE_ID, 'order-1', { totalAmount: 200 } as any);
      expect(result.totalAmount).toBe(200);
    });

    it('should throw NotFoundError when order not found', async () => {
      vi.mocked(OrderCrud.getById).mockResolvedValue(null);

      await expect(service.update(STORE_ID, 'nonexistent', {})).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('should delete an order with received status', async () => {
      vi.mocked(OrderCrud.getById).mockResolvedValue(createOrder({ status: ORDER_STATUS.RECEIVED }));
      vi.mocked(OrderCrud.delete).mockResolvedValue(undefined);

      await expect(service.delete(STORE_ID, 'order-1')).resolves.toBeUndefined();
    });

    it('should throw NotFoundError when order not found', async () => {
      vi.mocked(OrderCrud.getById).mockResolvedValue(null);

      await expect(service.delete(STORE_ID, 'nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when order status is not received', async () => {
      vi.mocked(OrderCrud.getById).mockResolvedValue(createOrder({ status: ORDER_STATUS.IN_PROGRESS }));

      await expect(service.delete(STORE_ID, 'order-1')).rejects.toThrow(ValidationError);
    });
  });
});
