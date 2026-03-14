import { PgOrderRepository } from './order.repository.js';
import type { CustomerOrderFilters } from './order.repository.js';
import type { CreateOrderDTO, Order, OrderStatus, OrderSource } from './order.types.js';

export class OrderCrud {
  static async create(storeId: number, data: CreateOrderDTO & { totalAmount: number; recurringGroupId?: number }): Promise<Order> {
    return PgOrderRepository.create(storeId, data);
  }

  static async getById(storeId: number, id: number): Promise<Order | null> {
    return PgOrderRepository.findById(storeId, id);
  }

  static async getAll(storeId: number, filters?: { status?: OrderStatus; excludePaid?: boolean }): Promise<Order[]> {
    return PgOrderRepository.findAll(storeId, filters);
  }

  static async getAllPaginated(storeId: number, options: { limit: number; offset: number }, filters?: { status?: OrderStatus; excludePaid?: boolean; dateFrom?: string; dateTo?: string; search?: string }): Promise<{ orders: Order[]; total: number }> {
    return PgOrderRepository.findAllPaginated(storeId, options, filters);
  }

  static async update(storeId: number, id: number, data: Partial<Order>): Promise<Order> {
    return PgOrderRepository.update(storeId, id, data);
  }

  static async updateStatus(storeId: number, id: number, status: OrderStatus): Promise<Order> {
    return PgOrderRepository.updateStatus(storeId, id, status);
  }

  static async delete(storeId: number, id: number): Promise<void> {
    return PgOrderRepository.delete(storeId, id);
  }

  static async findByCustomerId(storeId: number, customerId: number, options?: { limit: number; offset: number }, filters?: CustomerOrderFilters): Promise<{ orders: Order[]; total: number }> {
    return PgOrderRepository.findByCustomerId(storeId, customerId, options, filters);
  }

  static async findByOrderNumber(storeId: number, orderNumber: number): Promise<Order | null> {
    return PgOrderRepository.findByOrderNumber(storeId, orderNumber);
  }

  static async findByDateRange(storeId: number, filters: { from: string; to: string; status?: number }): Promise<Order[]> {
    return PgOrderRepository.findByDateRange(storeId, filters);
  }

  static async getCalendarAggregates(storeId: number, filters: { from: string; to: string }): Promise<Array<{ day: string; total: number; pendingApproval: number; received: number; inProgress: number; ready: number; delivered: number }>> {
    return PgOrderRepository.getCalendarAggregates(storeId, filters);
  }

  static async findByDay(storeId: number, filters: { date: string; status?: number; limit: number; offset: number }): Promise<{ orders: Order[]; total: number }> {
    return PgOrderRepository.findByDay(storeId, filters);
  }

  static async findFutureByRecurringGroup(storeId: number, recurringGroupId: number, afterDate: Date): Promise<Order[]> {
    return PgOrderRepository.findFutureByRecurringGroup(storeId, recurringGroupId, afterDate);
  }

  static async countActiveByCustomer(storeId: number, customerId: number): Promise<number> {
    return PgOrderRepository.countActiveByCustomer(storeId, customerId);
  }

  static async countActiveByRecipe(storeId: number, recipeId: string): Promise<number> {
    return PgOrderRepository.countActiveByRecipe(storeId, recipeId);
  }

  static async createWithSource(
    storeId: number,
    data: CreateOrderDTO & { totalAmount: number; recurringGroupId?: number },
    source: OrderSource,
    initialStatus: number,
  ): Promise<Order> {
    return PgOrderRepository.createWithSource(storeId, data, source, initialStatus);
  }

  static async cancelOrder(storeId: number, id: number, expectedStatus: number, reason?: string): Promise<Order | null> {
    return PgOrderRepository.cancelOrder(storeId, id, expectedStatus, reason);
  }

  static async requestCancellation(storeId: number, id: number, expectedStatus: number, reason?: string): Promise<Order | null> {
    return PgOrderRepository.requestCancellation(storeId, id, expectedStatus, reason);
  }

  static async declineCancellation(storeId: number, id: number): Promise<Order | null> {
    return PgOrderRepository.declineCancellation(storeId, id);
  }

  static async approveOrder(storeId: number, id: number): Promise<Order | null> {
    return PgOrderRepository.approveOrder(storeId, id);
  }

  static async countPendingActions(storeId: number): Promise<{ pendingApproval: number; cancellationRequested: number }> {
    return PgOrderRepository.countPendingActions(storeId);
  }
}
