import type { UseCase } from '../../../core/use-case.js';
import type { Order, OrderStatus } from '../order.types.js';
import { OrderCrud } from '../orderCrud.js';
import { NotFoundError, ValidationError } from '../../../core/errors/app-error.js';
import { ErrorCode, ORDER_STATUS_FLOW } from '@mise/shared/src/constants/index.js';

export class UpdateOrderStatusUseCase implements UseCase<{ order: Order; previousStatus: OrderStatus }, [number, number, OrderStatus]> {
  async execute(storeId: number, id: number, newStatus: OrderStatus): Promise<{ order: Order; previousStatus: OrderStatus }> {
    const existing = await OrderCrud.getById(storeId, id);
    if (!existing) {
      throw new NotFoundError('Order not found', ErrorCode.ORDER_NOT_FOUND);
    }

    const allowedTransitions = ORDER_STATUS_FLOW[existing.status as number] ?? [];
    if (!allowedTransitions.includes(newStatus as number)) {
      throw new ValidationError(
        `Cannot transition from status ${existing.status} to ${newStatus}. Allowed: ${allowedTransitions.join(', ') || 'none'}`,
        ErrorCode.ORDER_INVALID_STATUS_TRANSITION,
      );
    }

    const previousStatus = existing.status;
    const order = await OrderCrud.updateStatus(storeId, id, newStatus);
    return { order, previousStatus };
  }
}
