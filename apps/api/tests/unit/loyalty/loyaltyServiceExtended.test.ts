import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoyaltyService } from '../../../src/modules/loyalty/loyalty.service.js';
import { ValidationError } from '../../../src/core/errors/app-error.js';

vi.mock('../../../src/modules/loyalty/loyaltyCrud.js', () => ({
  LoyaltyCrud: {
    getConfig: vi.fn(),
    upsertConfig: vi.fn(),
    getCustomerBalance: vi.fn(),
    createTransaction: vi.fn(),
    updateCustomerBalance: vi.fn(),
    getTransactionsByCustomer: vi.fn(),
    findTransactionByPaymentId: vi.fn(),
  },
}));

vi.mock('../../../src/modules/orders/order.repository.js', () => ({
  PgOrderRepository: {
    findByIdInternal: vi.fn(),
  },
}));

import { LoyaltyCrud } from '../../../src/modules/loyalty/loyaltyCrud.js';
import { PgOrderRepository } from '../../../src/modules/orders/order.repository.js';

const STORE_ID = 'store-1';
const CUSTOMER_ID = 'cust-1';

function makeConfig(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cfg-1',
    storeId: STORE_ID,
    isActive: true,
    pointsPerShekel: 1,
    pointValue: 0.1,
    minRedeemPoints: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('LoyaltyService - extended', () => {
  let service: LoyaltyService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new LoyaltyService();
  });

  describe('awardPointsForPayment - edge cases', () => {
    it('should award zero points when amount is sub-unit (e.g., 0.5 with 1 point/shekel)', async () => {
      vi.mocked(PgOrderRepository.findByIdInternal).mockResolvedValue({ storeId: STORE_ID, customerId: CUSTOMER_ID });
      vi.mocked(LoyaltyCrud.getConfig).mockResolvedValue(makeConfig({ pointsPerShekel: 1 }));

      await service.awardPointsForPayment('pay-1', 'order-1', 0.5);

      // Math.floor(0.5 * 1) = 0 → should not award
      expect(LoyaltyCrud.updateCustomerBalance).not.toHaveBeenCalled();
    });

    it('should floor fractional points (e.g., 33 * 1.5 = 49.5 → 49)', async () => {
      vi.mocked(PgOrderRepository.findByIdInternal).mockResolvedValue({ storeId: STORE_ID, customerId: CUSTOMER_ID });
      vi.mocked(LoyaltyCrud.getConfig).mockResolvedValue(makeConfig({ pointsPerShekel: 1.5 }));
      vi.mocked(LoyaltyCrud.updateCustomerBalance).mockResolvedValue(49);
      vi.mocked(LoyaltyCrud.createTransaction).mockResolvedValue({} as any);

      await service.awardPointsForPayment('pay-1', 'order-1', 33);

      expect(LoyaltyCrud.updateCustomerBalance).toHaveBeenCalledWith(STORE_ID, CUSTOMER_ID, 49);
    });

    it('should handle very large payment amounts', async () => {
      vi.mocked(PgOrderRepository.findByIdInternal).mockResolvedValue({ storeId: STORE_ID, customerId: CUSTOMER_ID });
      vi.mocked(LoyaltyCrud.getConfig).mockResolvedValue(makeConfig({ pointsPerShekel: 10 }));
      vi.mocked(LoyaltyCrud.updateCustomerBalance).mockResolvedValue(1000000);
      vi.mocked(LoyaltyCrud.createTransaction).mockResolvedValue({} as any);

      await service.awardPointsForPayment('pay-1', 'order-1', 100000);

      expect(LoyaltyCrud.updateCustomerBalance).toHaveBeenCalledWith(STORE_ID, CUSTOMER_ID, 1000000);
    });

    it('should not award points when amount is zero', async () => {
      vi.mocked(PgOrderRepository.findByIdInternal).mockResolvedValue({ storeId: STORE_ID, customerId: CUSTOMER_ID });
      vi.mocked(LoyaltyCrud.getConfig).mockResolvedValue(makeConfig());

      await service.awardPointsForPayment('pay-1', 'order-1', 0);

      expect(LoyaltyCrud.updateCustomerBalance).not.toHaveBeenCalled();
    });
  });

  describe('deductPointsForRefund - edge cases', () => {
    it('should do nothing when order not found', async () => {
      vi.mocked(PgOrderRepository.findByIdInternal).mockResolvedValue(null);

      await service.deductPointsForRefund('pay-1', 'order-1', 100);

      expect(LoyaltyCrud.findTransactionByPaymentId).not.toHaveBeenCalled();
    });

    it('should not deduct when customer balance is zero', async () => {
      vi.mocked(PgOrderRepository.findByIdInternal).mockResolvedValue({ storeId: STORE_ID, customerId: CUSTOMER_ID });
      vi.mocked(LoyaltyCrud.findTransactionByPaymentId).mockResolvedValue({
        id: 'tx-1', storeId: STORE_ID, customerId: CUSTOMER_ID, paymentId: 'pay-1',
        type: 'earned', points: 100, balanceAfter: 100, description: null, createdAt: new Date(),
      });
      vi.mocked(LoyaltyCrud.getCustomerBalance).mockResolvedValue({ balance: 0, lifetimeEarned: 100, lifetimeRedeemed: 100 });

      await service.deductPointsForRefund('pay-1', 'order-1', 100);

      // deduction = min(100, 0) = 0 → should not call update
      expect(LoyaltyCrud.updateCustomerBalance).not.toHaveBeenCalled();
    });

    it('should deduct full earned amount when balance is sufficient', async () => {
      vi.mocked(PgOrderRepository.findByIdInternal).mockResolvedValue({ storeId: STORE_ID, customerId: CUSTOMER_ID });
      vi.mocked(LoyaltyCrud.findTransactionByPaymentId).mockResolvedValue({
        id: 'tx-1', storeId: STORE_ID, customerId: CUSTOMER_ID, paymentId: 'pay-1',
        type: 'earned', points: 50, balanceAfter: 50, description: null, createdAt: new Date(),
      });
      vi.mocked(LoyaltyCrud.getCustomerBalance).mockResolvedValue({ balance: 200, lifetimeEarned: 200, lifetimeRedeemed: 0 });
      vi.mocked(LoyaltyCrud.updateCustomerBalance).mockResolvedValue(150);
      vi.mocked(LoyaltyCrud.createTransaction).mockResolvedValue({} as any);

      await service.deductPointsForRefund('pay-1', 'order-1', 50);

      expect(LoyaltyCrud.updateCustomerBalance).toHaveBeenCalledWith(STORE_ID, CUSTOMER_ID, -50);
      expect(LoyaltyCrud.createTransaction).toHaveBeenCalledWith(
        STORE_ID,
        expect.objectContaining({ type: 'adjusted', points: -50 }),
      );
    });
  });

  describe('adjustPoints - edge cases', () => {
    it('should allow adjustment that brings balance to exactly zero', async () => {
      vi.mocked(LoyaltyCrud.getCustomerBalance).mockResolvedValue({ balance: 50, lifetimeEarned: 50, lifetimeRedeemed: 0 });
      vi.mocked(LoyaltyCrud.updateCustomerBalance).mockResolvedValue(0);
      vi.mocked(LoyaltyCrud.createTransaction).mockResolvedValue({} as any);

      await service.adjustPoints(STORE_ID, CUSTOMER_ID, -50);

      expect(LoyaltyCrud.updateCustomerBalance).toHaveBeenCalledWith(STORE_ID, CUSTOMER_ID, -50);
    });

    it('should record correct balanceAfter on positive adjustment', async () => {
      vi.mocked(LoyaltyCrud.updateCustomerBalance).mockResolvedValue(250);
      vi.mocked(LoyaltyCrud.createTransaction).mockResolvedValue({} as any);

      await service.adjustPoints(STORE_ID, CUSTOMER_ID, 100);

      expect(LoyaltyCrud.createTransaction).toHaveBeenCalledWith(
        STORE_ID,
        expect.objectContaining({ points: 100, balanceAfter: 250 }),
      );
    });

    it('should pass description through to transaction', async () => {
      vi.mocked(LoyaltyCrud.updateCustomerBalance).mockResolvedValue(100);
      vi.mocked(LoyaltyCrud.createTransaction).mockResolvedValue({} as any);

      await service.adjustPoints(STORE_ID, CUSTOMER_ID, 100, 'Welcome bonus');

      expect(LoyaltyCrud.createTransaction).toHaveBeenCalledWith(
        STORE_ID,
        expect.objectContaining({ description: 'Welcome bonus' }),
      );
    });

    it('should pass undefined description when not provided', async () => {
      vi.mocked(LoyaltyCrud.updateCustomerBalance).mockResolvedValue(100);
      vi.mocked(LoyaltyCrud.createTransaction).mockResolvedValue({} as any);

      await service.adjustPoints(STORE_ID, CUSTOMER_ID, 100);

      expect(LoyaltyCrud.createTransaction).toHaveBeenCalledWith(
        STORE_ID,
        expect.objectContaining({ description: undefined }),
      );
    });
  });

  describe('redeemPoints - edge cases', () => {
    it('should redeem exact balance (all points)', async () => {
      vi.mocked(LoyaltyCrud.getConfig).mockResolvedValue(makeConfig({ pointValue: 0.1 }));
      vi.mocked(LoyaltyCrud.getCustomerBalance).mockResolvedValue({ balance: 100, lifetimeEarned: 100, lifetimeRedeemed: 0 });
      vi.mocked(LoyaltyCrud.updateCustomerBalance).mockResolvedValue(0);
      vi.mocked(LoyaltyCrud.createTransaction).mockResolvedValue({} as any);

      const result = await service.redeemPoints(STORE_ID, CUSTOMER_ID, 100);

      expect(result).toEqual({ pointsRedeemed: 100, shekelValue: 10 });
      expect(LoyaltyCrud.updateCustomerBalance).toHaveBeenCalledWith(STORE_ID, CUSTOMER_ID, -100);
    });

    it('should calculate shekelValue with correct precision', async () => {
      vi.mocked(LoyaltyCrud.getConfig).mockResolvedValue(makeConfig({ pointValue: 0.333 }));
      vi.mocked(LoyaltyCrud.getCustomerBalance).mockResolvedValue({ balance: 100, lifetimeEarned: 100, lifetimeRedeemed: 0 });
      vi.mocked(LoyaltyCrud.updateCustomerBalance).mockResolvedValue(97);
      vi.mocked(LoyaltyCrud.createTransaction).mockResolvedValue({} as any);

      const result = await service.redeemPoints(STORE_ID, CUSTOMER_ID, 3);

      // 3 * 0.333 = 0.999 → toFixed(2) → 1.00
      expect(result.shekelValue).toBe(1);
    });

    it('should store redemption description in format redeemed:points:value', async () => {
      vi.mocked(LoyaltyCrud.getConfig).mockResolvedValue(makeConfig({ pointValue: 0.5 }));
      vi.mocked(LoyaltyCrud.getCustomerBalance).mockResolvedValue({ balance: 200, lifetimeEarned: 200, lifetimeRedeemed: 0 });
      vi.mocked(LoyaltyCrud.updateCustomerBalance).mockResolvedValue(100);
      vi.mocked(LoyaltyCrud.createTransaction).mockResolvedValue({} as any);

      await service.redeemPoints(STORE_ID, CUSTOMER_ID, 100);

      expect(LoyaltyCrud.createTransaction).toHaveBeenCalledWith(
        STORE_ID,
        expect.objectContaining({ description: 'redeemed:100:50' }),
      );
    });

    it('should throw when points equal balance but below minimum', async () => {
      vi.mocked(LoyaltyCrud.getConfig).mockResolvedValue(makeConfig({ minRedeemPoints: 200 }));
      vi.mocked(LoyaltyCrud.getCustomerBalance).mockResolvedValue({ balance: 100, lifetimeEarned: 100, lifetimeRedeemed: 0 });

      await expect(service.redeemPoints(STORE_ID, CUSTOMER_ID, 100)).rejects.toThrow(ValidationError);
    });

    it('should succeed when points exactly equal minimum', async () => {
      vi.mocked(LoyaltyCrud.getConfig).mockResolvedValue(makeConfig({ minRedeemPoints: 50 }));
      vi.mocked(LoyaltyCrud.getCustomerBalance).mockResolvedValue({ balance: 100, lifetimeEarned: 100, lifetimeRedeemed: 0 });
      vi.mocked(LoyaltyCrud.updateCustomerBalance).mockResolvedValue(50);
      vi.mocked(LoyaltyCrud.createTransaction).mockResolvedValue({} as any);

      const result = await service.redeemPoints(STORE_ID, CUSTOMER_ID, 50);

      expect(result.pointsRedeemed).toBe(50);
    });
  });

  describe('getCustomerBalance', () => {
    it('should delegate to LoyaltyCrud', async () => {
      const summary = { balance: 75, lifetimeEarned: 100, lifetimeRedeemed: 25 };
      vi.mocked(LoyaltyCrud.getCustomerBalance).mockResolvedValue(summary);

      const result = await service.getCustomerBalance(STORE_ID, CUSTOMER_ID);

      expect(result).toEqual(summary);
      expect(LoyaltyCrud.getCustomerBalance).toHaveBeenCalledWith(STORE_ID, CUSTOMER_ID);
    });
  });

  describe('getCustomerTransactions', () => {
    it('should delegate to LoyaltyCrud with pagination', async () => {
      const txResult = { items: [], total: 0 };
      vi.mocked(LoyaltyCrud.getTransactionsByCustomer).mockResolvedValue(txResult);

      const result = await service.getCustomerTransactions(STORE_ID, CUSTOMER_ID, { limit: 5, offset: 10 });

      expect(result).toEqual(txResult);
      expect(LoyaltyCrud.getTransactionsByCustomer).toHaveBeenCalledWith(STORE_ID, CUSTOMER_ID, { limit: 5, offset: 10 });
    });

    it('should work without pagination options', async () => {
      const txResult = { items: [], total: 0 };
      vi.mocked(LoyaltyCrud.getTransactionsByCustomer).mockResolvedValue(txResult);

      const result = await service.getCustomerTransactions(STORE_ID, CUSTOMER_ID);

      expect(LoyaltyCrud.getTransactionsByCustomer).toHaveBeenCalledWith(STORE_ID, CUSTOMER_ID, undefined);
    });
  });
});
