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

const STORE_ID = 'store-1';

describe('PaymentService', () => {
  let service: PaymentService;
  let eventBus: EventBus;

  beforeEach(() => {
    vi.clearAllMocks();
    eventBus = createMockEventBus();
    vi.mocked(getEventBus).mockReturnValue(eventBus);
    service = new PaymentService();
  });

  describe('create', () => {
    it('should publish payment.received event after creating payment', async () => {
      const payment = createPayment({ id: 'pay-1', orderId: 'order-1', amount: 50 });
      vi.mocked(PaymentCrud.create).mockResolvedValue(payment);

      await service.create(STORE_ID, { orderId: 'order-1', amount: 50, method: 'cash' });

      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'payment.received',
          payload: expect.objectContaining({
            paymentId: 'pay-1',
            orderId: 'order-1',
            amount: 50,
          }),
        }),
      );
    });
  });

  describe('delete', () => {
    it('should delete an existing payment', async () => {
      vi.mocked(PaymentCrud.getById).mockResolvedValue(createPayment());
      vi.mocked(PaymentCrud.delete).mockResolvedValue(undefined);

      await expect(service.delete(STORE_ID, 'pay-1')).resolves.toBeUndefined();
    });

    it('should throw NotFoundError when payment not found', async () => {
      vi.mocked(PaymentCrud.getById).mockResolvedValue(null);

      await expect(service.delete(STORE_ID, 'nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getByOrderId', () => {
    it('should return payments for an order', async () => {
      const payments = [createPayment({ id: 'p1' }), createPayment({ id: 'p2' })];
      vi.mocked(PaymentCrud.getByOrderId).mockResolvedValue(payments);

      const result = await service.getByOrderId(STORE_ID, 'order-1');
      expect(result).toHaveLength(2);
    });
  });
});
