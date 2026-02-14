import type { IOrderRepository } from '../order.repository.js';
import { ORDER_STATUS } from '../order.types.js';
import { NotFoundError, ValidationError } from '../../../core/errors/app-error.js';

export class DeleteOrderUseCase {
  constructor(private orderRepository: IOrderRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.orderRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Order not found');
    }
    if (existing.status !== ORDER_STATUS.RECEIVED) {
      throw new ValidationError('Can only delete orders with "received" status');
    }
    return this.orderRepository.delete(id);
  }
}
