import { PgOrderRepository } from './order.repository.js';
import type { CustomerOrderFilters } from './order.repository.js';
import type { CreateOrderDTO, Order, OrderStatus } from './order.types.js';
import { ORDER_STATUS } from './order.types.js';
import { NotFoundError, ValidationError } from '../../core/errors/app-error.js';

export class OrderCrud {
  static async create(storeId: string, data: CreateOrderDTO & { totalAmount: number }): Promise<Order> {
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
    return PgOrderRepository.create(storeId, data);
  }

  static async getById(storeId: string, id: string): Promise<Order | null> {
    return PgOrderRepository.findById(storeId, id);
  }

  static async getAll(storeId: string, filters?: { status?: OrderStatus; excludePaid?: boolean }): Promise<Order[]> {
    return PgOrderRepository.findAll(storeId, filters);
  }

  static async update(storeId: string, id: string, data: Partial<Order>): Promise<Order> {
    return PgOrderRepository.update(storeId, id, data);
  }

  static async updateStatus(storeId: string, id: string, status: OrderStatus): Promise<Order> {
    return PgOrderRepository.updateStatus(storeId, id, status);
  }

  static async delete(storeId: string, id: string): Promise<void> {
    const existing = await PgOrderRepository.findById(storeId, id);
    if (!existing) {
      throw new NotFoundError('Order not found');
    }
    if (existing.status !== ORDER_STATUS.RECEIVED) {
      throw new ValidationError('Can only delete orders with "received" status');
    }
    return PgOrderRepository.delete(storeId, id);
  }

  static async findByCustomerId(storeId: string, customerId: string, options?: { limit: number; offset: number }, filters?: CustomerOrderFilters): Promise<{ orders: Order[]; total: number }> {
    return PgOrderRepository.findByCustomerId(storeId, customerId, options, filters);
  }
}
