import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderService } from '../../../src/modules/orders/order.service.js';
import { createMockOrderRepository, createMockEventBus, createOrder } from '../helpers/mock-factories.js';
import { NotFoundError } from '../../../src/core/errors/app-error.js';
import type { IOrderRepository } from '../../../src/modules/orders/order.repository.js';
import type { EventBus } from '../../../src/core/events/event-bus.js';

// Mock the shared constants
vi.mock('@mise/shared/src/constants/index.js', () => ({
  ORDER_STATUS_FLOW: {
    received: ['in_progress'],
    in_progress: ['ready'],
    ready: ['delivered'],
    delivered: [],
  },
}));

describe('OrderService', () => {
  let service: OrderService;
  let repo: IOrderRepository;
  let eventBus: EventBus;

  beforeEach(() => {
    repo = createMockOrderRepository();
    eventBus = createMockEventBus();
    service = new OrderService(repo, eventBus);
  });

  describe('create', () => {
    it('should publish order.created event after creating order', async () => {
      const order = createOrder();
      vi.mocked(repo.create).mockResolvedValue(order);

      await service.create({
        customerId: 'cust-1',
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
    it('should publish order.statusChanged event after status update', async () => {
      const existing = createOrder({ status: 'received' });
      const updated = createOrder({ status: 'in_progress' });
      vi.mocked(repo.findById).mockResolvedValue(existing);
      vi.mocked(repo.updateStatus).mockResolvedValue(updated);

      await service.updateStatus('order-1', 'in_progress');

      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'order.statusChanged',
          payload: expect.objectContaining({
            orderId: 'order-1',
            previousStatus: 'received',
            newStatus: 'in_progress',
          }),
        }),
      );
    });
  });

  describe('getById', () => {
    it('should return order when found', async () => {
      const order = createOrder();
      vi.mocked(repo.findById).mockResolvedValue(order);

      const result = await service.getById('order-1');
      expect(result).toEqual(order);
    });

    it('should throw NotFoundError when order not found', async () => {
      vi.mocked(repo.findById).mockResolvedValue(null);

      await expect(service.getById('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });
});
