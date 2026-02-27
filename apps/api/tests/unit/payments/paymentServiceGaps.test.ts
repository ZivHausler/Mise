import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictError, NotFoundError } from '../../../src/core/errors/app-error.js';
import { createPayment, createOrder } from '../helpers/mock-factories.js';

vi.mock('../../../src/core/events/event-bus.js', () => ({
  getEventBus: vi.fn(() => ({ publish: vi.fn().mockResolvedValue(undefined), subscribe: vi.fn() })),
}));

vi.mock('../../../src/modules/payments/paymentCrud.js', () => ({
  PaymentCrud: {
    create: vi.fn(),
    getById: vi.fn(),
    getAll: vi.fn(),
    getByOrderId: vi.fn(),
    getByCustomerId: vi.fn(),
    refund: vi.fn(),
    delete: vi.fn(),
    getPaidAmountsByStore: vi.fn(),
  },
}));

vi.mock('../../../src/modules/customers/customerCrud.js', () => ({
  CustomerCrud: { getById: vi.fn().mockResolvedValue(null) },
}));

import { PaymentCrud } from '../../../src/modules/payments/paymentCrud.js';
import { PaymentService } from '../../../src/modules/payments/payment.service.js';

const STORE_ID = 1;

describe('PaymentService - Gap Coverage', () => {
  let service: PaymentService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PaymentService();
  });

  describe('refund', () => {
    it('should refund a payment', async () => {
      const payment = createPayment({ status: 'completed' });
      const refunded = createPayment({ status: 'refunded' });
      vi.mocked(PaymentCrud.getById).mockResolvedValue(payment);
      vi.mocked(PaymentCrud.refund).mockResolvedValue(refunded);

      const result = await service.refund(STORE_ID, 1);
      expect(result.status).toBe('refunded');
    });

    it('should throw NotFoundError when payment not found', async () => {
      vi.mocked(PaymentCrud.getById).mockResolvedValue(null);
      await expect(service.refund(STORE_ID, 999)).rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError when already refunded', async () => {
      vi.mocked(PaymentCrud.getById).mockResolvedValue(createPayment({ status: 'refunded' }));
      await expect(service.refund(STORE_ID, 1)).rejects.toThrow(ConflictError);
    });
  });

  describe('getAll', () => {
    it('should return paginated payments', async () => {
      vi.mocked(PaymentCrud.getAll).mockResolvedValue({ items: [], total: 0, page: 1, limit: 10, totalPages: 0 });
      const result = await service.getAll(STORE_ID, { page: 1, limit: 10 });
      expect(result.items).toHaveLength(0);
    });
  });

  describe('getByCustomerId', () => {
    it('should return customer payments', async () => {
      vi.mocked(PaymentCrud.getByCustomerId).mockResolvedValue({ items: [createPayment()], total: 1, page: 1, limit: 10, totalPages: 1 });
      const result = await service.getByCustomerId(STORE_ID, 1);
      expect(result.items).toHaveLength(1);
    });
  });

  describe('getPaymentStatuses', () => {
    it('should calculate statuses from orders and payments', async () => {
      const mockOrderService = {
        getAll: vi.fn().mockResolvedValue([
          createOrder({ id: 1, totalAmount: 100 }),
          createOrder({ id: 2, totalAmount: 200 }),
          createOrder({ id: 3, totalAmount: 50 }),
        ]),
        getById: vi.fn(),
      };
      const svc = new PaymentService(mockOrderService as any);
      vi.mocked(PaymentCrud.getPaidAmountsByStore).mockResolvedValue([
        { orderId: 1, paidAmount: 100 },  // fully paid
        { orderId: 2, paidAmount: 50 },   // partial
        // order 3 not in paid list -> unpaid
      ]);

      const result = await svc.getPaymentStatuses(STORE_ID);
      expect(result[1]).toBe('paid');
      expect(result[2]).toBe('partial');
      expect(result[3]).toBe('unpaid');
    });

    it('should return empty when no order service', async () => {
      vi.mocked(PaymentCrud.getPaidAmountsByStore).mockResolvedValue([]);
      const result = await service.getPaymentStatuses(STORE_ID);
      expect(result).toEqual({});
    });
  });

  describe('getPaymentSummary', () => {
    it('should get order total from order service when available', async () => {
      const mockOrderService = {
        getAll: vi.fn(),
        getById: vi.fn().mockResolvedValue(createOrder({ totalAmount: 500 })),
      };
      const svc = new PaymentService(mockOrderService as any);
      // Mock the use case indirectly through the service
      vi.mocked(PaymentCrud.getByOrderId).mockResolvedValue([createPayment({ amount: 200 })]);

      await svc.getPaymentSummary(STORE_ID, 1);
      expect(mockOrderService.getById).toHaveBeenCalledWith(STORE_ID, 1);
    });
  });
});
