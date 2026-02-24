import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderService } from '../../../src/modules/orders/order.service.js';
import { createMockEventBus, createOrder } from '../helpers/mock-factories.js';
import { NotFoundError } from '../../../src/core/errors/app-error.js';
import { ORDER_STATUS } from '../../../src/modules/orders/order.types.js';
import type { EventBus } from '../../../src/core/events/event-bus.js';

vi.mock('../../../src/core/events/event-bus.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../src/core/events/event-bus.js')>();
  return { ...original, getEventBus: vi.fn() };
});

vi.mock('@mise/shared/src/constants/index.js', () => ({
  ORDER_STATUS_FLOW: {
    0: [1],    // received → in_progress
    1: [0, 2], // in_progress → received, ready
    2: [1, 3], // ready → in_progress, delivered
    3: [2],    // delivered → ready
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

vi.mock('../../../src/modules/customers/customerCrud.js', () => ({
  CustomerCrud: {
    getById: vi.fn().mockResolvedValue(null),
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
import { UpdateOrderStatusUseCase } from '../../../src/modules/orders/use-cases/updateOrderStatus.js';
import { getEventBus } from '../../../src/core/events/event-bus.js';

const STORE_ID = 1;

describe('OrderService', () => {
  let service: OrderService;
  let eventBus: EventBus;

  beforeEach(() => {
    vi.clearAllMocks();
    eventBus = createMockEventBus();
    vi.mocked(getEventBus).mockReturnValue(eventBus);
    service = new OrderService();
  });

  describe('create', () => {
    it('should publish order.created event after creating order', async () => {
      const order = createOrder();
      vi.mocked(OrderCrud.create).mockResolvedValue(order);

      await service.create(STORE_ID, {
        customerId: 1,
        items: [{ recipeId: 'r1', quantity: 2 }],
      });

      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'order.created',
          payload: expect.objectContaining({
            orderId: order.id,
            customerId: order.customerId,
          }),
        }),
      );
    });
  });

  describe('updateStatus', () => {
    it('should update status without publishing event', async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        order: createOrder({ status: ORDER_STATUS.IN_PROGRESS }),
        previousStatus: ORDER_STATUS.RECEIVED,
      });
      vi.mocked(UpdateOrderStatusUseCase).mockImplementation(() => ({ execute: mockExecute }) as any);

      // Recreate service to pick up the new mock
      service = new OrderService();

      const result = await service.updateStatus(STORE_ID, 1, ORDER_STATUS.IN_PROGRESS);

      expect(result.status).toBe(ORDER_STATUS.IN_PROGRESS);
      expect(eventBus.publish).not.toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should return order when found', async () => {
      const order = createOrder();
      vi.mocked(OrderCrud.getById).mockResolvedValue(order);

      const result = await service.getById(STORE_ID, 1);
      expect(result).toEqual(order);
    });

    it('should throw NotFoundError when order not found', async () => {
      vi.mocked(OrderCrud.getById).mockResolvedValue(null);

      await expect(service.getById(STORE_ID, 999)).rejects.toThrow(NotFoundError);
    });
  });
});
