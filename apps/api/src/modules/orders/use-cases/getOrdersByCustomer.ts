import type { IOrderRepository } from '../order.repository.js';
import type { Order } from '../order.types.js';

export class GetOrdersByCustomerUseCase {
  constructor(private orderRepository: IOrderRepository) {}

  async execute(customerId: string): Promise<Order[]> {
    return this.orderRepository.findByCustomerId(customerId);
  }
}
