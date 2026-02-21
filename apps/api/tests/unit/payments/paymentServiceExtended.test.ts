import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentService } from '../../../src/modules/payments/payment.service.js';
import { createMockEventBus, createPayment } from '../helpers/mock-factories.js';
import { NotFoundError } from '../../../src/core/errors/app-error.js';
import type { EventBus } from '../../../src/core/events/event-bus.js';

vi.mock('../../../src/core/events/event-bus.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../src/core/events/event-bus.js')>();
  return { ...original, getEventBus: vi.fn() };
});

vi.mock('../../../src/modules/payments/paymentCrud.js', () => ({
  PaymentCrud: {
    create: vi.fn(),
    getById: vi.fn(),
    getAll: vi.fn(),
    getByOrderId: vi.fn(),
    getByCustomerId: vi.fn(),
    getPaidAmountsByStore: vi.fn(),
    refund: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../../src/modules/payments/use-cases/getPaymentSummary.js', () => ({
  GetPaymentSummaryUseCase: vi.fn().mockImplementation(() => ({
    execute: vi.fn(),
  })),
}));

import { PaymentCrud } from '../../../src/modules/payments/paymentCrud.js';
import { getEventBus } from '../../../src/core/events/event-bus.js';

const STORE_ID = 1;

describe('PaymentService - extended', () => {
  let service: PaymentService;
  let eventBus: EventBus;

  beforeEach(() => {
    vi.clearAllMocks();
    eventBus = createMockEventBus();
    vi.mocked(getEventBus).mockReturnValue(eventBus);
    service = new PaymentService();
  });

  describe('getAll', () => {
    it('should return paginated payments', async () => {
      const result = { data: [createPayment()], total: 1, page: 1, limit: 10 };
      vi.mocked(PaymentCrud.getAll).mockResolvedValue(result);

      const res = await service.getAll(STORE_ID, { limit: 10, offset: 0 });
      expect(res.data).toHaveLength(1);
    });
  });

  describe('getByCustomerId', () => {
    it('should return payments for a customer', async () => {
      const result = { data: [createPayment()], total: 1, page: 1, limit: 10 };
      vi.mocked(PaymentCrud.getByCustomerId).mockResolvedValue(result);

      const res = await service.getByCustomerId(STORE_ID, 1);
      expect(res.data).toHaveLength(1);
    });
  });

  describe('getPaymentSummary', () => {
    it('should return payment summary without order service', async () => {
      const summary = { orderId: 1, totalAmount: 0, paidAmount: 50, status: 'partial' as const, payments: [] };
      const mockExecute = vi.fn().mockResolvedValue(summary);

      // Re-create service to use new mock
      const { GetPaymentSummaryUseCase } = await import('../../../src/modules/payments/use-cases/getPaymentSummary.js');
      vi.mocked(GetPaymentSummaryUseCase).mockImplementation(() => ({ execute: mockExecute }) as any);
      service = new PaymentService();

      const result = await service.getPaymentSummary(STORE_ID, 1);
      expect(mockExecute).toHaveBeenCalledWith(STORE_ID, 1, 0);
    });
  });

  describe('getPaymentStatuses', () => {
    it('should return empty statuses when no order service', async () => {
      vi.mocked(PaymentCrud.getPaidAmountsByStore).mockResolvedValue([]);

      const result = await service.getPaymentStatuses(STORE_ID);
      expect(result).toEqual({});
    });
  });

  describe('refund', () => {
    it('should refund an existing payment', async () => {
      const payment = createPayment({ status: 'completed' });
      vi.mocked(PaymentCrud.getById).mockResolvedValue(payment);
      const refunded = createPayment({ status: 'refunded' as any });
      vi.mocked(PaymentCrud.refund).mockResolvedValue(refunded);

      const result = await service.refund(STORE_ID, 1);
      expect(result.status).toBe('refunded');
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: 'payment.refunded' }),
      );
    });

    it('should throw NotFoundError when payment not found', async () => {
      vi.mocked(PaymentCrud.getById).mockResolvedValue(null);

      await expect(service.refund(STORE_ID, 999)).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when payment already refunded', async () => {
      vi.mocked(PaymentCrud.getById).mockResolvedValue(createPayment({ status: 'refunded' as any }));

      await expect(service.refund(STORE_ID, 1)).rejects.toThrow(NotFoundError);
    });
  });
});
