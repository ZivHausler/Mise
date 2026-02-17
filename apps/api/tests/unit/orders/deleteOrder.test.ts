import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderCrud } from '../../../src/modules/orders/crud/orderCrud.js';
import { createOrder } from '../helpers/mock-factories.js';
import { NotFoundError, ValidationError } from '../../../src/core/errors/app-error.js';
import { ORDER_STATUS } from '../../../src/modules/orders/order.types.js';

vi.mock('../../../src/modules/orders/order.repository.js', () => ({
  PgOrderRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
    findByCustomerId: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    delete: vi.fn(),
  },
}));

import { PgOrderRepository } from '../../../src/modules/orders/order.repository.js';

const STORE_ID = 'store-1';

describe('OrderCrud.delete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete an order with received status', async () => {
    vi.mocked(PgOrderRepository.findById).mockResolvedValue(createOrder({ status: ORDER_STATUS.RECEIVED }));
    vi.mocked(PgOrderRepository.delete).mockResolvedValue(undefined);

    await expect(OrderCrud.delete(STORE_ID, 'order-1')).resolves.toBeUndefined();
    expect(PgOrderRepository.delete).toHaveBeenCalledWith(STORE_ID, 'order-1');
  });

  it('should throw NotFoundError when order does not exist', async () => {
    vi.mocked(PgOrderRepository.findById).mockResolvedValue(null);

    await expect(OrderCrud.delete(STORE_ID, 'nonexistent')).rejects.toThrow(NotFoundError);
  });

  it('should throw ValidationError when order is in_progress', async () => {
    vi.mocked(PgOrderRepository.findById).mockResolvedValue(createOrder({ status: ORDER_STATUS.IN_PROGRESS }));

    await expect(OrderCrud.delete(STORE_ID, 'order-1')).rejects.toThrow(ValidationError);
    await expect(OrderCrud.delete(STORE_ID, 'order-1')).rejects.toThrow('Can only delete orders with "received" status');
  });

  it('should throw ValidationError when order is ready', async () => {
    vi.mocked(PgOrderRepository.findById).mockResolvedValue(createOrder({ status: ORDER_STATUS.READY }));

    await expect(OrderCrud.delete(STORE_ID, 'order-1')).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError when order is delivered', async () => {
    vi.mocked(PgOrderRepository.findById).mockResolvedValue(createOrder({ status: ORDER_STATUS.DELIVERED }));

    await expect(OrderCrud.delete(STORE_ID, 'order-1')).rejects.toThrow(ValidationError);
  });
});
