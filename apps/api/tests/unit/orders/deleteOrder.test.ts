import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderCrud } from '../../../src/modules/orders/orderCrud.js';
import { createOrder } from '../helpers/mock-factories.js';
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

  it('should delegate delete to PgOrderRepository', async () => {
    vi.mocked(PgOrderRepository.delete).mockResolvedValue(undefined);

    await expect(OrderCrud.delete(STORE_ID, 'order-1')).resolves.toBeUndefined();
    expect(PgOrderRepository.delete).toHaveBeenCalledWith(STORE_ID, 'order-1');
  });
});
