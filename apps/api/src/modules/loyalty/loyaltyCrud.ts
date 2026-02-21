import { PgLoyaltyRepository } from './loyalty.repository.js';
import type { PaginationOptions, PaginatedResult } from './loyalty.repository.js';
import type { LoyaltyConfig, LoyaltyTransaction, CustomerLoyaltySummary, CreateLoyaltyTransactionDTO, UpsertLoyaltyConfigDTO } from './loyalty.types.js';

export class LoyaltyCrud {
  static async getConfig(storeId: number): Promise<LoyaltyConfig | null> {
    return PgLoyaltyRepository.getConfig(storeId);
  }

  static async upsertConfig(storeId: number, data: UpsertLoyaltyConfigDTO): Promise<LoyaltyConfig> {
    return PgLoyaltyRepository.upsertConfig(storeId, data);
  }

  static async getCustomerBalance(storeId: number, customerId: number): Promise<CustomerLoyaltySummary> {
    return PgLoyaltyRepository.getCustomerBalance(storeId, customerId);
  }

  static async createTransaction(storeId: number, data: CreateLoyaltyTransactionDTO & { balanceAfter: number }): Promise<LoyaltyTransaction> {
    return PgLoyaltyRepository.createTransaction(storeId, data);
  }

  static async updateCustomerBalance(storeId: number, customerId: number, delta: number): Promise<number> {
    return PgLoyaltyRepository.updateCustomerBalance(storeId, customerId, delta);
  }

  static async getTransactionsByCustomer(storeId: number, customerId: number, options?: PaginationOptions): Promise<PaginatedResult<LoyaltyTransaction>> {
    return PgLoyaltyRepository.findTransactionsByCustomer(storeId, customerId, options);
  }

  static async findTransactionByPaymentId(storeId: number, paymentId: number, type: string): Promise<LoyaltyTransaction | null> {
    return PgLoyaltyRepository.findTransactionByPaymentId(storeId, paymentId, type);
  }
}
