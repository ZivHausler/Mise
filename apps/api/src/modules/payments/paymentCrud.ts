import { PgPaymentRepository } from './payment.repository.js';
import type { PaginationOptions, PaginatedResult, CustomerPaymentFilters, PaymentFilters } from './payment.repository.js';
import type { CreatePaymentDTO, Payment } from './payment.types.js';

export class PaymentCrud {
  static async create(storeId: number, data: CreatePaymentDTO): Promise<Payment> {
    return PgPaymentRepository.create(storeId, data);
  }

  static async getById(storeId: number, id: number): Promise<Payment | null> {
    return PgPaymentRepository.findById(storeId, id);
  }

  static async getAll(storeId: number, options?: PaginationOptions, filters?: PaymentFilters): Promise<PaginatedResult<Payment>> {
    return PgPaymentRepository.findAll(storeId, options, filters);
  }

  static async getByOrderId(storeId: number, orderId: number): Promise<Payment[]> {
    return PgPaymentRepository.findByOrderId(storeId, orderId);
  }

  static async getByCustomerId(storeId: number, customerId: number, options?: PaginationOptions, filters?: CustomerPaymentFilters): Promise<PaginatedResult<Payment>> {
    return PgPaymentRepository.findByCustomerId(storeId, customerId, options, filters);
  }

  static async getPaidAmountsByStore(storeId: number): Promise<{ orderId: number; paidAmount: number }[]> {
    return PgPaymentRepository.findPaidAmountsByStore(storeId);
  }

  static async refund(storeId: number, id: number): Promise<Payment> {
    return PgPaymentRepository.refund(storeId, id);
  }

  static async delete(storeId: number, id: number): Promise<void> {
    return PgPaymentRepository.delete(storeId, id);
  }
}
