import type { UseCase } from '../../../core/use-case.js';
import { OrderCrud } from '../orderCrud.js';
import type { Order } from '../order.types.js';
import type { CustomerOrderFilters } from '../order.repository.js';

export class GetOrdersByCustomerUseCase implements UseCase<{ orders: Order[]; total: number }, [string, string, ({ limit: number; offset: number })?, CustomerOrderFilters?]> {
  async execute(storeId: string, customerId: string, options?: { limit: number; offset: number }, filters?: CustomerOrderFilters): Promise<{ orders: Order[]; total: number }> {
    return OrderCrud.findByCustomerId(storeId, customerId, options, filters);
  }
}
