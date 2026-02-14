import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetOrdersByCustomerUseCase } from '../../../src/modules/orders/use-cases/getOrdersByCustomer.js';
import { createMockOrderRepository, createOrder } from '../helpers/mock-factories.js';
import type { IOrderRepository } from '../../../src/modules/orders/order.repository.js';

describe('GetOrdersByCustomerUseCase', () => {
  let useCase: GetOrdersByCustomerUseCase;
  let repo: IOrderRepository;

  beforeEach(() => {
    repo = createMockOrderRepository();
    useCase = new GetOrdersByCustomerUseCase(repo);
  });

  it('should return orders for a customer', async () => {
    const orders = [
      createOrder({ id: 'o1', customerId: 'cust-1' }),
      createOrder({ id: 'o2', customerId: 'cust-1' }),
    ];
    vi.mocked(repo.findByCustomerId).mockResolvedValue(orders);

    const result = await useCase.execute('cust-1');

    expect(result).toHaveLength(2);
    expect(repo.findByCustomerId).toHaveBeenCalledWith('cust-1');
  });

  it('should return empty array when customer has no orders', async () => {
    vi.mocked(repo.findByCustomerId).mockResolvedValue([]);

    const result = await useCase.execute('cust-no-orders');

    expect(result).toEqual([]);
  });
});
