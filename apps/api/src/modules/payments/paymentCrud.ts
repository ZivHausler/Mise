import { PgPaymentRepository } from './payment.repository.js';
import type { PaginationOptions, PaginatedResult, CustomerPaymentFilters } from './payment.repository.js';
import type { CreatePaymentDTO, Payment } from './payment.types.js';
import { ValidationError } from '../../core/errors/app-error.js';

export class PaymentCrud {
  static async create(storeId: string, data: CreatePaymentDTO): Promise<Payment> {
    if (data.amount <= 0) {
      throw new ValidationError('Payment amount must be positive');
    }
    if (!data.orderId) {
      throw new ValidationError('Order ID is required');
    }
    return PgPaymentRepository.create(storeId, data);
  }

  static async getById(storeId: string, id: string): Promise<Payment | null> {
    return PgPaymentRepository.findById(storeId, id);
  }

  static async getAll(storeId: string, options?: PaginationOptions): Promise<PaginatedResult<Payment>> {
    return PgPaymentRepository.findAll(storeId, options);
  }

  static async getByOrderId(storeId: string, orderId: string): Promise<Payment[]> {
    return PgPaymentRepository.findByOrderId(storeId, orderId);
  }

  static async getByCustomerId(storeId: string, customerId: string, options?: PaginationOptions, filters?: CustomerPaymentFilters): Promise<PaginatedResult<Payment>> {
    return PgPaymentRepository.findByCustomerId(storeId, customerId, options, filters);
  }

  static async delete(storeId: string, id: string): Promise<void> {
    return PgPaymentRepository.delete(storeId, id);
  }
}
