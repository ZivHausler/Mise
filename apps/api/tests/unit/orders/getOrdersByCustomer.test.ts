import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetOrdersByCustomerUseCase } from '../../../src/modules/orders/use-cases/getOrdersByCustomer.js';
import { createOrder } from '../helpers/mock-factories.js';

vi.mock('../../../src/modules/orders/crud/orderCrud.js', () => ({
  OrderCrud: {
    findByCustomerId: vi.fn(),
  },
}));

import { OrderCrud } from '../../../src/modules/orders/crud/orderCrud.js';

const STORE_ID = 'store-1';

describe('GetOrdersByCustomerUseCase', () => {
  let useCase: GetOrdersByCustomerUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new GetOrdersByCustomerUseCase();
  });

  it('should return orders for a customer', async () => {
    const orders = [
      createOrder({ id: 'o1', customerId: 'cust-1' }),
      createOrder({ id: 'o2', customerId: 'cust-1' }),
    ];
    vi.mocked(OrderCrud.findByCustomerId).mockResolvedValue({ orders, total: 2 });

    const result = await useCase.execute(STORE_ID, 'cust-1');

    expect(result.orders).toHaveLength(2);
    expect(OrderCrud.findByCustomerId).toHaveBeenCalledWith(STORE_ID, 'cust-1', undefined, undefined);
  });

  it('should return empty array when customer has no orders', async () => {
    vi.mocked(OrderCrud.findByCustomerId).mockResolvedValue({ orders: [], total: 0 });

    const result = await useCase.execute(STORE_ID, 'cust-no-orders');

    expect(result.orders).toEqual([]);
  });
});
