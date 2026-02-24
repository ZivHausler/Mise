import { LoyaltyCrud } from './loyaltyCrud.js';
import { LOYALTY_TRANSACTION_TYPE } from './loyalty.types.js';
import type { LoyaltyConfig, CustomerLoyaltySummary, LoyaltyTransaction, UpsertLoyaltyConfigDTO } from './loyalty.types.js';
import type { PaginationOptions, PaginatedResult } from './loyalty.repository.js';
import { PgOrderRepository } from '../orders/order.repository.js';
import { PgCustomerRepository } from '../customers/customer.repository.js';
import { ValidationError } from '../../core/errors/app-error.js';

const DEFAULT_CONFIG: Omit<LoyaltyConfig, 'id' | 'storeId' | 'createdAt' | 'updatedAt'> = {
  isActive: false,
  pointsPerShekel: 1.0,
  pointValue: 0.1,
  minRedeemPoints: 0,
};

export class LoyaltyService {
  async getConfig(storeId: number): Promise<LoyaltyConfig | (typeof DEFAULT_CONFIG & { storeId: number })> {
    const config = await LoyaltyCrud.getConfig(storeId);
    if (config) return config;
    return { ...DEFAULT_CONFIG, storeId };
  }

  async upsertConfig(storeId: number, data: UpsertLoyaltyConfigDTO): Promise<LoyaltyConfig> {
    return LoyaltyCrud.upsertConfig(storeId, data);
  }

  async getCustomerBalance(storeId: number, customerId: number): Promise<CustomerLoyaltySummary> {
    return LoyaltyCrud.getCustomerBalance(storeId, customerId);
  }

  async getCustomerTransactions(storeId: number, customerId: number, options?: PaginationOptions): Promise<PaginatedResult<LoyaltyTransaction>> {
    return LoyaltyCrud.getTransactionsByCustomer(storeId, customerId, options);
  }

  async awardPointsForPayment(paymentId: number, orderId: number, amount: number): Promise<void> {
    const order = await PgOrderRepository.findByIdInternal(orderId);
    if (!order) return;

    const config = await LoyaltyCrud.getConfig(order.storeId);
    if (!config || !config.isActive) return;

    const TIER_MULTIPLIERS = { bronze: 1, silver: 1.5, gold: 2 } as const;
    let multiplier = 1;

    if (order.customerId) {
      const customer = await PgCustomerRepository.findById(order.customerId, order.storeId);
      if (customer && !customer.loyaltyEnabled) return;
      if (customer) {
        multiplier = TIER_MULTIPLIERS[customer.loyaltyTier] ?? 1;
      }
    }

    const points = Math.floor(amount * config.pointsPerShekel * multiplier);
    if (points <= 0) return;

    const newBalance = await LoyaltyCrud.updateCustomerBalance(order.storeId, order.customerId, points);
    await LoyaltyCrud.createTransaction(order.storeId, {
      customerId: order.customerId,
      paymentId,
      type: LOYALTY_TRANSACTION_TYPE.EARNED,
      points,
      balanceAfter: newBalance,
      description: `payment_earned`,
    });
  }

  async deductPointsForRefund(paymentId: number, orderId: number, amount: number): Promise<void> {
    const order = await PgOrderRepository.findByIdInternal(orderId);
    if (!order) return;

    const originalTx = await LoyaltyCrud.findTransactionByPaymentId(order.storeId, paymentId, LOYALTY_TRANSACTION_TYPE.EARNED);
    if (!originalTx) return;

    const summary = await LoyaltyCrud.getCustomerBalance(order.storeId, order.customerId);
    const deduction = Math.min(originalTx.points, summary.balance);
    if (deduction <= 0) return;

    const newBalance = await LoyaltyCrud.updateCustomerBalance(order.storeId, order.customerId, -deduction);
    await LoyaltyCrud.createTransaction(order.storeId, {
      customerId: order.customerId,
      paymentId,
      type: LOYALTY_TRANSACTION_TYPE.ADJUSTED,
      points: -deduction,
      balanceAfter: newBalance,
      description: `refund_deducted`,
    });
  }

  async adjustPoints(storeId: number, customerId: number, points: number, description?: string): Promise<LoyaltyTransaction> {
    if (points < 0) {
      const summary = await LoyaltyCrud.getCustomerBalance(storeId, customerId);
      if (summary.balance + points < 0) {
        throw new ValidationError('Adjustment would result in negative balance');
      }
    }

    const newBalance = await LoyaltyCrud.updateCustomerBalance(storeId, customerId, points);
    return LoyaltyCrud.createTransaction(storeId, {
      customerId,
      type: LOYALTY_TRANSACTION_TYPE.ADJUSTED,
      points,
      balanceAfter: newBalance,
      description,
    });
  }

  async redeemPoints(storeId: number, customerId: number, points: number): Promise<{ pointsRedeemed: number; shekelValue: number }> {
    const config = await LoyaltyCrud.getConfig(storeId);
    if (!config || !config.isActive) {
      throw new ValidationError('Loyalty program is not active');
    }

    const summary = await LoyaltyCrud.getCustomerBalance(storeId, customerId);
    if (summary.balance < points) {
      throw new ValidationError('Insufficient points balance');
    }
    if (points < config.minRedeemPoints) {
      throw new ValidationError(`Minimum ${config.minRedeemPoints} points required for redemption`);
    }

    const shekelValue = Number((points * config.pointValue).toFixed(2));
    const newBalance = await LoyaltyCrud.updateCustomerBalance(storeId, customerId, -points);
    await LoyaltyCrud.createTransaction(storeId, {
      customerId,
      type: LOYALTY_TRANSACTION_TYPE.REDEEMED,
      points: -points,
      balanceAfter: newBalance,
      description: `redeemed:${points}:${shekelValue}`,
    });

    return { pointsRedeemed: points, shekelValue };
  }
}
