import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentService } from '../../../src/modules/payments/payment.service.js';
import { createMockPaymentRepository, createMockEventBus, createPayment } from '../helpers/mock-factories.js';
import { NotFoundError } from '../../../src/core/errors/app-error.js';
import type { IPaymentRepository } from '../../../src/modules/payments/payment.repository.js';
import type { EventBus } from '../../../src/core/events/event-bus.js';

describe('PaymentService', () => {
  let service: PaymentService;
  let repo: IPaymentRepository;
  let eventBus: EventBus;

  beforeEach(() => {
    repo = createMockPaymentRepository();
    eventBus = createMockEventBus();
    service = new PaymentService(repo, eventBus);
  });

  describe('create', () => {
    it('should publish payment.received event after creating payment', async () => {
      const payment = createPayment({ id: 'pay-1', orderId: 'order-1', amount: 50 });
      vi.mocked(repo.create).mockResolvedValue(payment);

      await service.create({ orderId: 'order-1', amount: 50, method: 'cash' });

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
      vi.mocked(repo.findById).mockResolvedValue(createPayment());
      vi.mocked(repo.delete).mockResolvedValue(undefined);

      await expect(service.delete('pay-1')).resolves.toBeUndefined();
    });

    it('should throw NotFoundError when payment not found', async () => {
      vi.mocked(repo.findById).mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getByOrderId', () => {
    it('should return payments for an order', async () => {
      const payments = [createPayment({ id: 'p1' }), createPayment({ id: 'p2' })];
      vi.mocked(repo.findByOrderId).mockResolvedValue(payments);

      const result = await service.getByOrderId('order-1');
      expect(result).toHaveLength(2);
    });
  });
});
