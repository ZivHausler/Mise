import type { IOrderRepository } from '../order.repository.js';
import type { Order, OrderStatus } from '../order.types.js';
import { NotFoundError, ValidationError } from '../../../core/errors/app-error.js';
import { ORDER_STATUS_FLOW } from '@mise/shared/src/constants/index.js';

export class UpdateOrderStatusUseCase {
  constructor(private orderRepository: IOrderRepository) {}

  async execute(id: string, newStatus: OrderStatus): Promise<{ order: Order; previousStatus: OrderStatus }> {
    const existing = await this.orderRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Order not found');
    }

    const allowedTransitions = ORDER_STATUS_FLOW[existing.status] ?? [];
    if (!allowedTransitions.includes(newStatus)) {
      throw new ValidationError(
        `Cannot transition from "${existing.status}" to "${newStatus}". Allowed: ${allowedTransitions.join(', ') || 'none'}`,
      );
    }

    const previousStatus = existing.status;
    const order = await this.orderRepository.updateStatus(id, newStatus);
    return { order, previousStatus };
  }
}
