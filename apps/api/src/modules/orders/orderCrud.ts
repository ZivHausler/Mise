import { PgOrderRepository } from './order.repository.js';
import type { CustomerOrderFilters } from './order.repository.js';
import type { CreateOrderDTO, Order, OrderStatus } from './order.types.js';

export class OrderCrud {
  static async create(storeId: string, data: CreateOrderDTO & { totalAmount: number }): Promise<Order> {
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
    return PgOrderRepository.delete(storeId, id);
  }

  static async findByCustomerId(storeId: string, customerId: string, options?: { limit: number; offset: number }, filters?: CustomerOrderFilters): Promise<{ orders: Order[]; total: number }> {
    return PgOrderRepository.findByCustomerId(storeId, customerId, options, filters);
  }

  static async findByDateRange(storeId: string, filters: { from: string; to: string; status?: number }): Promise<Order[]> {
    return PgOrderRepository.findByDateRange(storeId, filters);
  }

  static async getCalendarAggregates(storeId: string, filters: { from: string; to: string }): Promise<Array<{ day: string; total: number; received: number; inProgress: number; ready: number; delivered: number }>> {
    return PgOrderRepository.getCalendarAggregates(storeId, filters);
  }

  static async findByDay(storeId: string, filters: { date: string; status?: number; limit: number; offset: number }): Promise<{ orders: Order[]; total: number }> {
    return PgOrderRepository.findByDay(storeId, filters);
  }
}
