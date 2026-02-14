import type { IOrderRepository } from '../order.repository.js';
import type { CreateOrderDTO, Order } from '../order.types.js';
import { ValidationError } from '../../../core/errors/app-error.js';

export class CreateOrderUseCase {
  constructor(private orderRepository: IOrderRepository) {}

  async execute(data: CreateOrderDTO & { totalAmount: number }): Promise<Order> {
    if (!data.customerId) {
      throw new ValidationError('Customer ID is required');
    }
    if (!data.items || data.items.length === 0) {
      throw new ValidationError('At least one item is required');
    }
    for (const item of data.items) {
      if (item.quantity <= 0) {
        throw new ValidationError('Item quantity must be positive');
      }
    }
    return this.orderRepository.create(data);
  }
}
