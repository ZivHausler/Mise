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

describe('LoyaltyService', () => {
  let service: LoyaltyService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new LoyaltyService();
  });

  describe('awardPointsForPayment', () => {
    it('should do nothing when config is inactive', async () => {
      vi.mocked(PgOrderRepository.findByIdInternal).mockResolvedValue({ storeId: STORE_ID, customerId: CUSTOMER_ID });
      vi.mocked(LoyaltyCrud.getConfig).mockResolvedValue(null);

      await service.awardPointsForPayment('pay-1', 'order-1', 100);

      expect(LoyaltyCrud.updateCustomerBalance).not.toHaveBeenCalled();
    });

    it('should award correct points when config is active', async () => {
      vi.mocked(PgOrderRepository.findByIdInternal).mockResolvedValue({ storeId: STORE_ID, customerId: CUSTOMER_ID });
      vi.mocked(LoyaltyCrud.getConfig).mockResolvedValue({
        id: 'cfg-1', storeId: STORE_ID, isActive: true, pointsPerShekel: 2, pointValue: 0.1, minRedeemPoints: 0,
        createdAt: new Date(), updatedAt: new Date(),
      });
      vi.mocked(LoyaltyCrud.updateCustomerBalance).mockResolvedValue(200);
      vi.mocked(LoyaltyCrud.createTransaction).mockResolvedValue({} as any);

      await service.awardPointsForPayment('pay-1', 'order-1', 100);

      expect(LoyaltyCrud.updateCustomerBalance).toHaveBeenCalledWith(STORE_ID, CUSTOMER_ID, 200);
      expect(LoyaltyCrud.createTransaction).toHaveBeenCalledWith(STORE_ID, expect.objectContaining({
        customerId: CUSTOMER_ID,
        type: 'earned',
        points: 200,
        balanceAfter: 200,
      }));
    });

    it('should do nothing when order not found', async () => {
      vi.mocked(PgOrderRepository.findByIdInternal).mockResolvedValue(null);

      await service.awardPointsForPayment('pay-1', 'order-1', 100);

      expect(LoyaltyCrud.getConfig).not.toHaveBeenCalled();
    });
  });

  describe('deductPointsForRefund', () => {
    it('should do nothing when no original earned transaction', async () => {
      vi.mocked(PgOrderRepository.findByIdInternal).mockResolvedValue({ storeId: STORE_ID, customerId: CUSTOMER_ID });
      vi.mocked(LoyaltyCrud.findTransactionByPaymentId).mockResolvedValue(null);

      await service.deductPointsForRefund('pay-1', 'order-1', 100);

      expect(LoyaltyCrud.updateCustomerBalance).not.toHaveBeenCalled();
    });

    it('should cap deduction at current balance', async () => {
      vi.mocked(PgOrderRepository.findByIdInternal).mockResolvedValue({ storeId: STORE_ID, customerId: CUSTOMER_ID });
      vi.mocked(LoyaltyCrud.findTransactionByPaymentId).mockResolvedValue({
        id: 'tx-1', storeId: STORE_ID, customerId: CUSTOMER_ID, paymentId: 'pay-1',
        type: 'earned', points: 100, balanceAfter: 100, description: null, createdAt: new Date(),
      });
      vi.mocked(LoyaltyCrud.getCustomerBalance).mockResolvedValue({ balance: 30, lifetimeEarned: 100, lifetimeRedeemed: 70 });
      vi.mocked(LoyaltyCrud.updateCustomerBalance).mockResolvedValue(0);
      vi.mocked(LoyaltyCrud.createTransaction).mockResolvedValue({} as any);

      await service.deductPointsForRefund('pay-1', 'order-1', 100);

      expect(LoyaltyCrud.updateCustomerBalance).toHaveBeenCalledWith(STORE_ID, CUSTOMER_ID, -30);
    });
  });

  describe('adjustPoints', () => {
    it('should allow positive adjustment', async () => {
      vi.mocked(LoyaltyCrud.updateCustomerBalance).mockResolvedValue(150);
      vi.mocked(LoyaltyCrud.createTransaction).mockResolvedValue({} as any);

      await service.adjustPoints(STORE_ID, CUSTOMER_ID, 50, 'bonus');

      expect(LoyaltyCrud.updateCustomerBalance).toHaveBeenCalledWith(STORE_ID, CUSTOMER_ID, 50);
    });

    it('should throw when negative adjustment exceeds balance', async () => {
      vi.mocked(LoyaltyCrud.getCustomerBalance).mockResolvedValue({ balance: 20, lifetimeEarned: 20, lifetimeRedeemed: 0 });

      await expect(service.adjustPoints(STORE_ID, CUSTOMER_ID, -50, 'correction')).rejects.toThrow(ValidationError);
    });

    it('should allow negative adjustment within balance', async () => {
      vi.mocked(LoyaltyCrud.getCustomerBalance).mockResolvedValue({ balance: 100, lifetimeEarned: 100, lifetimeRedeemed: 0 });
      vi.mocked(LoyaltyCrud.updateCustomerBalance).mockResolvedValue(50);
      vi.mocked(LoyaltyCrud.createTransaction).mockResolvedValue({} as any);

      await service.adjustPoints(STORE_ID, CUSTOMER_ID, -50, 'correction');

      expect(LoyaltyCrud.updateCustomerBalance).toHaveBeenCalledWith(STORE_ID, CUSTOMER_ID, -50);
    });
  });

  describe('redeemPoints', () => {
    it('should throw when loyalty program is inactive', async () => {
      vi.mocked(LoyaltyCrud.getConfig).mockResolvedValue(null);

      await expect(service.redeemPoints(STORE_ID, CUSTOMER_ID, 50)).rejects.toThrow(ValidationError);
    });

    it('should throw when insufficient balance', async () => {
      vi.mocked(LoyaltyCrud.getConfig).mockResolvedValue({
        id: 'cfg-1', storeId: STORE_ID, isActive: true, pointsPerShekel: 1, pointValue: 0.1, minRedeemPoints: 0,
        createdAt: new Date(), updatedAt: new Date(),
      });
      vi.mocked(LoyaltyCrud.getCustomerBalance).mockResolvedValue({ balance: 30, lifetimeEarned: 30, lifetimeRedeemed: 0 });

      await expect(service.redeemPoints(STORE_ID, CUSTOMER_ID, 50)).rejects.toThrow(ValidationError);
    });

    it('should throw when below minimum redeem threshold', async () => {
      vi.mocked(LoyaltyCrud.getConfig).mockResolvedValue({
        id: 'cfg-1', storeId: STORE_ID, isActive: true, pointsPerShekel: 1, pointValue: 0.1, minRedeemPoints: 100,
        createdAt: new Date(), updatedAt: new Date(),
      });
      vi.mocked(LoyaltyCrud.getCustomerBalance).mockResolvedValue({ balance: 200, lifetimeEarned: 200, lifetimeRedeemed: 0 });

      await expect(service.redeemPoints(STORE_ID, CUSTOMER_ID, 50)).rejects.toThrow(ValidationError);
    });

    it('should redeem successfully and return shekelValue', async () => {
      vi.mocked(LoyaltyCrud.getConfig).mockResolvedValue({
        id: 'cfg-1', storeId: STORE_ID, isActive: true, pointsPerShekel: 1, pointValue: 0.1, minRedeemPoints: 0,
        createdAt: new Date(), updatedAt: new Date(),
      });
      vi.mocked(LoyaltyCrud.getCustomerBalance).mockResolvedValue({ balance: 100, lifetimeEarned: 100, lifetimeRedeemed: 0 });
      vi.mocked(LoyaltyCrud.updateCustomerBalance).mockResolvedValue(50);
      vi.mocked(LoyaltyCrud.createTransaction).mockResolvedValue({} as any);

      const result = await service.redeemPoints(STORE_ID, CUSTOMER_ID, 50);

      expect(result).toEqual({ pointsRedeemed: 50, shekelValue: 5 });
      expect(LoyaltyCrud.updateCustomerBalance).toHaveBeenCalledWith(STORE_ID, CUSTOMER_ID, -50);
    });
  });

  describe('getConfig', () => {
    it('should return defaults when no config exists', async () => {
      vi.mocked(LoyaltyCrud.getConfig).mockResolvedValue(null);

      const result = await service.getConfig(STORE_ID);

      expect(result).toMatchObject({ isActive: false, pointsPerShekel: 1, pointValue: 0.1, minRedeemPoints: 0, storeId: STORE_ID });
    });

    it('should return existing config', async () => {
      const config = {
        id: 'cfg-1', storeId: STORE_ID, isActive: true, pointsPerShekel: 2, pointValue: 0.5, minRedeemPoints: 10,
        createdAt: new Date(), updatedAt: new Date(),
      };
      vi.mocked(LoyaltyCrud.getConfig).mockResolvedValue(config);

      const result = await service.getConfig(STORE_ID);

      expect(result).toEqual(config);
    });
  });

  describe('upsertConfig', () => {
    it('should delegate to crud', async () => {
      const config = {
        id: 'cfg-1', storeId: STORE_ID, isActive: true, pointsPerShekel: 2, pointValue: 0.5, minRedeemPoints: 10,
        createdAt: new Date(), updatedAt: new Date(),
      };
      vi.mocked(LoyaltyCrud.upsertConfig).mockResolvedValue(config);

      const result = await service.upsertConfig(STORE_ID, { isActive: true, pointsPerShekel: 2 });

      expect(result).toEqual(config);
      expect(LoyaltyCrud.upsertConfig).toHaveBeenCalledWith(STORE_ID, { isActive: true, pointsPerShekel: 2 });
    });
  });
});
