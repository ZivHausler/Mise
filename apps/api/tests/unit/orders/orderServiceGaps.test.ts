import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundError, ValidationError } from '../../../src/core/errors/app-error.js';
import { createOrder } from '../helpers/mock-factories.js';
import { ORDER_STATUS } from '../../../src/modules/orders/order.types.js';

vi.mock('../../../src/core/events/event-bus.js', () => ({
  getEventBus: vi.fn(() => ({ publish: vi.fn().mockResolvedValue(undefined), subscribe: vi.fn() })),
}));

vi.mock('../../../src/modules/orders/orderCrud.js', () => ({
  OrderCrud: {
    create: vi.fn(),
    getById: vi.fn(),
    getAll: vi.fn(),
    getAllPaginated: vi.fn(),
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

vi.mock('../../../src/modules/customers/customerCrud.js', () => ({
  CustomerCrud: { getById: vi.fn().mockResolvedValue(null) },
}));

vi.mock('../../../src/modules/orders/use-cases/updateOrderStatus.js', () => ({
  UpdateOrderStatusUseCase: vi.fn().mockImplementation(() => ({ execute: vi.fn() })),
}));

vi.mock('../../../src/modules/shared/unitConversion.js', () => ({
  unitConversionFactor: vi.fn().mockReturnValue(1),
}));

vi.mock('../../../src/core/database/postgres.js', () => ({
  getPool: vi.fn(() => ({ query: vi.fn().mockResolvedValue({ rows: [{ id: 1 }] }) })),
}));

import { OrderCrud } from '../../../src/modules/orders/orderCrud.js';
import { OrderService } from '../../../src/modules/orders/order.service.js';

const STORE_ID = 1;

describe('OrderService - Gap Coverage', () => {
  let service: OrderService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new OrderService();
  });

  describe('getAll', () => {
    it('should return all orders', async () => {
      vi.mocked(OrderCrud.getAll).mockResolvedValue([createOrder()]);
      const result = await service.getAll(STORE_ID);
      expect(result).toHaveLength(1);
    });

    it('should pass filters', async () => {
      vi.mocked(OrderCrud.getAll).mockResolvedValue([]);
      await service.getAll(STORE_ID, { status: ORDER_STATUS.RECEIVED });
      expect(OrderCrud.getAll).toHaveBeenCalledWith(STORE_ID, { status: ORDER_STATUS.RECEIVED });
    });
  });

  describe('getAllPaginated', () => {
    it('should return paginated orders with filters', async () => {
      vi.mocked(OrderCrud.getAllPaginated).mockResolvedValue({ orders: [], total: 0 });
      const filters = { status: ORDER_STATUS.RECEIVED, search: 'cake' };
      await service.getAllPaginated(STORE_ID, { limit: 10, offset: 0 }, filters);
      expect(OrderCrud.getAllPaginated).toHaveBeenCalledWith(STORE_ID, { limit: 10, offset: 0 }, filters);
    });
  });

  describe('delete', () => {
    it('should throw NotFoundError when order not found', async () => {
      vi.mocked(OrderCrud.getById).mockResolvedValue(null);
      await expect(service.delete(STORE_ID, 999)).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when deleting RECEIVED order', async () => {
      vi.mocked(OrderCrud.getById).mockResolvedValue(createOrder({ status: ORDER_STATUS.RECEIVED }));
      await expect(service.delete(STORE_ID, 1)).rejects.toThrow(ValidationError);
    });

    it('should delete non-RECEIVED order', async () => {
      vi.mocked(OrderCrud.getById).mockResolvedValue(createOrder({ status: ORDER_STATUS.IN_PROGRESS }));
      vi.mocked(OrderCrud.delete).mockResolvedValue(undefined);
      await expect(service.delete(STORE_ID, 1)).resolves.toBeUndefined();
    });
  });

  describe('update', () => {
    it('should throw NotFoundError when order not found', async () => {
      vi.mocked(OrderCrud.getById).mockResolvedValue(null);
      await expect(service.update(STORE_ID, 999, { notes: 'hi' })).rejects.toThrow(NotFoundError);
    });

    it('should update notes only', async () => {
      const order = createOrder();
      vi.mocked(OrderCrud.getById).mockResolvedValue(order);
      vi.mocked(OrderCrud.update).mockResolvedValue({ ...order, notes: 'updated' } as any);

      const result = await service.update(STORE_ID, 1, { notes: 'updated' });
      expect(result.notes).toBe('updated');
    });

    it('should recalculate totalAmount when items updated', async () => {
      vi.mocked(OrderCrud.getById).mockResolvedValue(createOrder());
      vi.mocked(OrderCrud.update).mockImplementation(async (_s, _id, data) => {
        expect(data.totalAmount).toBe(0); // no recipe service, price defaults to 0
        return createOrder(data as any);
      });

      await service.update(STORE_ID, 1, {
        items: [{ recipeId: 'r1', quantity: 3, price: 0 }],
      });
    });
  });

  describe('updateFutureRecurring', () => {
    it('should return futureUpdated=0 when no recurringGroupId', async () => {
      vi.mocked(OrderCrud.getById).mockResolvedValue(createOrder({ recurringGroupId: undefined }));
      vi.mocked(OrderCrud.update).mockResolvedValue(createOrder());

      const result = await service.updateFutureRecurring(STORE_ID, 1, { notes: 'hi' });
      expect(result.futureUpdated).toBe(0);
    });
  });

  describe('getByDateRange', () => {
    it('should delegate to OrderCrud', async () => {
      vi.mocked(OrderCrud.findByDateRange).mockResolvedValue([]);
      await service.getByDateRange(STORE_ID, { from: '2025-01-01', to: '2025-01-31' });
      expect(OrderCrud.findByDateRange).toHaveBeenCalledWith(STORE_ID, { from: '2025-01-01', to: '2025-01-31' });
    });
  });

  describe('getCalendarAggregates', () => {
    it('should delegate to OrderCrud', async () => {
      vi.mocked(OrderCrud.getCalendarAggregates).mockResolvedValue([]);
      await service.getCalendarAggregates(STORE_ID, { from: '2025-01-01', to: '2025-01-31' });
      expect(OrderCrud.getCalendarAggregates).toHaveBeenCalled();
    });
  });

  describe('getByDay', () => {
    it('should delegate to OrderCrud', async () => {
      vi.mocked(OrderCrud.findByDay).mockResolvedValue({ orders: [], total: 0 });
      await service.getByDay(STORE_ID, { date: '2025-01-15', limit: 10, offset: 0 });
      expect(OrderCrud.findByDay).toHaveBeenCalled();
    });
  });

  describe('create with recipe service', () => {
    it('should resolve prices from recipe service', async () => {
      const mockRecipeService = {
        getById: vi.fn().mockResolvedValue({ sellingPrice: 25, name: 'Cake' }),
      };
      const svc = new OrderService(mockRecipeService as any);
      vi.mocked(OrderCrud.create).mockResolvedValue(createOrder({ totalAmount: 50 }));

      await svc.create(STORE_ID, { customerId: 1, items: [{ recipeId: 'r1', quantity: 2 }] });
      expect(OrderCrud.create).toHaveBeenCalledWith(STORE_ID, expect.objectContaining({ totalAmount: 50 }));
    });

    it('should fall back to frontend price when recipe not found', async () => {
      const mockRecipeService = {
        getById: vi.fn().mockRejectedValue(new Error('not found')),
      };
      const svc = new OrderService(mockRecipeService as any);
      vi.mocked(OrderCrud.create).mockResolvedValue(createOrder());

      await svc.create(STORE_ID, { customerId: 1, items: [{ recipeId: 'r1', quantity: 1 }] });
      // Should not throw
      expect(OrderCrud.create).toHaveBeenCalled();
    });
  });

  describe('createBatch', () => {
    it('should throw ValidationError when no occurrences match', async () => {
      await expect(
        service.createBatch(STORE_ID, { customerId: 1, items: [{ recipeId: 'r1', quantity: 1 }], dueDate: new Date('2025-06-16') }, {
          frequency: 'weekly',
          daysOfWeek: [0], // Sunday
          endDate: '2025-06-16', // Monday
        }),
      ).rejects.toThrow(ValidationError);
    });
  });
});
