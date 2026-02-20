import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderCrud } from '../../../src/modules/orders/orderCrud.js';
import { createOrder } from '../helpers/mock-factories.js';

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

describe('OrderCrud.create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create an order with valid data', async () => {
    const order = createOrder();
    vi.mocked(PgOrderRepository.create).mockResolvedValue(order);

    const result = await OrderCrud.create(STORE_ID, {
      customerId: 'cust-1',
      items: [{ recipeId: 'recipe-1', quantity: 2, unitPrice: 50 }],
      totalAmount: 100,
    });

    expect(result).toEqual(order);
    expect(PgOrderRepository.create).toHaveBeenCalledOnce();
  });

  it('should create order with multiple items', async () => {
    const order = createOrder({
      items: [
        { recipeId: 'r1', quantity: 2, unitPrice: 50 },
        { recipeId: 'r2', quantity: 1, unitPrice: 30 },
      ],
      totalAmount: 130,
    });
    vi.mocked(PgOrderRepository.create).mockResolvedValue(order);

    const result = await OrderCrud.create(STORE_ID, {
      customerId: 'cust-1',
      items: [
        { recipeId: 'r1', quantity: 2, unitPrice: 50 },
        { recipeId: 'r2', quantity: 1, unitPrice: 30 },
      ],
      totalAmount: 130,
    });

    expect(result.items).toHaveLength(2);
    expect(result.totalAmount).toBe(130);
  });

  it('should create order with notes and due date', async () => {
    const dueDate = new Date('2025-03-01');
    const order = createOrder({ notes: 'Rush order', dueDate });
    vi.mocked(PgOrderRepository.create).mockResolvedValue(order);

    const result = await OrderCrud.create(STORE_ID, {
      customerId: 'cust-1',
      items: [{ recipeId: 'r1', quantity: 1, unitPrice: 50 }],
      notes: 'Rush order',
      dueDate,
      totalAmount: 50,
    });

    expect(result.notes).toBe('Rush order');
    expect(result.dueDate).toEqual(dueDate);
  });
});
