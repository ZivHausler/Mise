import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderService } from '../../../src/modules/orders/order.service.js';
import { createMockEventBus, createOrder, createPayment } from '../helpers/mock-factories.js';
import { NotFoundError, ValidationError } from '../../../src/core/errors/app-error.js';
import { ORDER_STATUS } from '../../../src/modules/orders/order.types.js';
import type { EventBus } from '../../../src/core/events/event-bus.js';

// ─── Mocks ──────────────────────────────────────────────────────

vi.mock('../../../src/core/events/event-bus.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../src/core/events/event-bus.js')>();
  return { ...original, getEventBus: vi.fn() };
});

vi.mock('../../../src/modules/orders/orderCrud.js', () => ({
  OrderCrud: {
    getById: vi.fn(),
    approveOrder: vi.fn(),
    cancelOrder: vi.fn(),
    requestCancellation: vi.fn(),
    declineCancellation: vi.fn(),
    countPendingActions: vi.fn(),
  },
}));

vi.mock('../../../src/modules/orders/order-notification.repository.js', () => ({
  PgOrderNotificationRepository: {
    create: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../../src/modules/orders/order-notification.messages.js', () => ({
  getNotificationMessage: vi.fn().mockReturnValue('Status changed'),
}));

vi.mock('../../../src/modules/payments/paymentCrud.js', () => ({
  PaymentCrud: {
    getByOrderId: vi.fn().mockResolvedValue([]),
    refund: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../../src/modules/customers/customerCrud.js', () => ({
  CustomerCrud: { getById: vi.fn().mockResolvedValue(null) },
}));

vi.mock('../../../src/modules/orders/use-cases/updateOrderStatus.js', () => ({
  UpdateOrderStatusUseCase: vi.fn().mockImplementation(() => ({ execute: vi.fn() })),
}));

vi.mock('../../../src/modules/shared/unitConversion.js', () => ({
  unitConversionFactor: vi.fn().mockReturnValue(1),
}));

vi.mock('../../../src/core/logger/logger.js', () => ({
  appLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { OrderCrud } from '../../../src/modules/orders/orderCrud.js';
import { PgOrderNotificationRepository } from '../../../src/modules/orders/order-notification.repository.js';
import { PaymentCrud } from '../../../src/modules/payments/paymentCrud.js';
import { getEventBus } from '../../../src/core/events/event-bus.js';

// ─── Constants ──────────────────────────────────────────────────

const STORE_ID = 1;
const ORDER_ID = 1;

// ─── Helpers ────────────────────────────────────────────────────

function mockPayPalOrders() {
  return { refundCapture: vi.fn().mockResolvedValue(undefined) } as any;
}

// ─── Tests ──────────────────────────────────────────────────────

describe('Order Approval / Cancellation', () => {
  let service: OrderService;
  let eventBus: EventBus;
  let paypal: ReturnType<typeof mockPayPalOrders>;

  beforeEach(() => {
    vi.clearAllMocks();
    eventBus = createMockEventBus();
    vi.mocked(getEventBus).mockReturnValue(eventBus);
    paypal = mockPayPalOrders();
    service = new OrderService(undefined, undefined, paypal);
  });

  // ── approveOrder ────────────────────────────────────────────

  describe('approveOrder', () => {
    it('should approve a PENDING_APPROVAL order (0 → 1)', async () => {
      const approved = createOrder({ status: ORDER_STATUS.RECEIVED, source: 'storefront' });
      vi.mocked(OrderCrud.approveOrder).mockResolvedValue(approved);

      const result = await service.approveOrder(STORE_ID, ORDER_ID);

      expect(OrderCrud.approveOrder).toHaveBeenCalledWith(STORE_ID, ORDER_ID);
      expect(result.status).toBe(ORDER_STATUS.RECEIVED);
    });

    it('should throw ValidationError if order is not PENDING_APPROVAL', async () => {
      vi.mocked(OrderCrud.approveOrder).mockResolvedValue(null);
      vi.mocked(OrderCrud.getById).mockResolvedValue(createOrder({ status: ORDER_STATUS.IN_PROGRESS }));

      await expect(service.approveOrder(STORE_ID, ORDER_ID)).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError if order does not exist', async () => {
      vi.mocked(OrderCrud.approveOrder).mockResolvedValue(null);
      vi.mocked(OrderCrud.getById).mockResolvedValue(null);

      await expect(service.approveOrder(STORE_ID, ORDER_ID)).rejects.toThrow(NotFoundError);
    });

    it('should create notification on approval', async () => {
      const approved = createOrder({ status: ORDER_STATUS.RECEIVED, source: 'storefront' });
      vi.mocked(OrderCrud.approveOrder).mockResolvedValue(approved);

      await service.approveOrder(STORE_ID, ORDER_ID);

      expect(PgOrderNotificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: ORDER_ID,
          storeId: STORE_ID,
          statusFrom: ORDER_STATUS.PENDING_APPROVAL,
          statusTo: ORDER_STATUS.RECEIVED,
        }),
      );
    });

    it('should publish ORDER_STATUS_CHANGED event', async () => {
      const approved = createOrder({ status: ORDER_STATUS.RECEIVED, source: 'storefront' });
      vi.mocked(OrderCrud.approveOrder).mockResolvedValue(approved);

      await service.approveOrder(STORE_ID, ORDER_ID);

      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'order.statusChanged',
          payload: expect.objectContaining({
            fromStatus: ORDER_STATUS.PENDING_APPROVAL,
            toStatus: ORDER_STATUS.RECEIVED,
          }),
        }),
      );
    });
  });

  // ── cancelOrder — owner ─────────────────────────────────────

  describe('cancelOrder (owner)', () => {
    const ownerCancellable = [
      ORDER_STATUS.PENDING_APPROVAL,
      ORDER_STATUS.RECEIVED,
      ORDER_STATUS.IN_PROGRESS,
      ORDER_STATUS.READY,
      ORDER_STATUS.CANCELLATION_REQUESTED,
    ] as const;

    for (const status of ownerCancellable) {
      it(`should cancel from status ${status}`, async () => {
        vi.mocked(OrderCrud.getById).mockResolvedValue(createOrder({ status }));
        vi.mocked(OrderCrud.cancelOrder).mockResolvedValue(createOrder({ status: ORDER_STATUS.CANCELLED, source: 'web' }));

        const result = await service.cancelOrder(STORE_ID, ORDER_ID, 'reason', 'owner');

        expect(result.status).toBe(ORDER_STATUS.CANCELLED);
        expect(OrderCrud.cancelOrder).toHaveBeenCalledWith(STORE_ID, ORDER_ID, status, 'reason');
      });
    }

    it('should throw when cancelling from DELIVERED (4)', async () => {
      vi.mocked(OrderCrud.getById).mockResolvedValue(createOrder({ status: ORDER_STATUS.DELIVERED }));

      await expect(service.cancelOrder(STORE_ID, ORDER_ID, undefined, 'owner')).rejects.toThrow(ValidationError);
    });

    it('should throw when cancelling from CANCELLED (5)', async () => {
      vi.mocked(OrderCrud.getById).mockResolvedValue(createOrder({ status: ORDER_STATUS.CANCELLED }));

      await expect(service.cancelOrder(STORE_ID, ORDER_ID, undefined, 'owner')).rejects.toThrow(ValidationError);
    });

    it('should create notification on cancel', async () => {
      vi.mocked(OrderCrud.getById).mockResolvedValue(createOrder({ status: ORDER_STATUS.RECEIVED }));
      vi.mocked(OrderCrud.cancelOrder).mockResolvedValue(createOrder({ status: ORDER_STATUS.CANCELLED, source: 'web' }));

      await service.cancelOrder(STORE_ID, ORDER_ID, 'burnt', 'owner');

      expect(PgOrderNotificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          statusFrom: ORDER_STATUS.RECEIVED,
          statusTo: ORDER_STATUS.CANCELLED,
        }),
      );
    });
  });

  // ── cancelOrder — customer ──────────────────────────────────

  describe('cancelOrder (customer)', () => {
    it('should allow direct cancel from PENDING_APPROVAL (0)', async () => {
      vi.mocked(OrderCrud.getById).mockResolvedValue(createOrder({ status: ORDER_STATUS.PENDING_APPROVAL }));
      vi.mocked(OrderCrud.cancelOrder).mockResolvedValue(createOrder({ status: ORDER_STATUS.CANCELLED, source: 'storefront' }));

      const result = await service.cancelOrder(STORE_ID, ORDER_ID, undefined, 'customer');

      expect(result.status).toBe(ORDER_STATUS.CANCELLED);
    });

    it('should reject direct cancel from RECEIVED (1)', async () => {
      vi.mocked(OrderCrud.getById).mockResolvedValue(createOrder({ status: ORDER_STATUS.RECEIVED }));

      await expect(service.cancelOrder(STORE_ID, ORDER_ID, undefined, 'customer')).rejects.toThrow(ValidationError);
    });

    it('should reject direct cancel from IN_PROGRESS (2)', async () => {
      vi.mocked(OrderCrud.getById).mockResolvedValue(createOrder({ status: ORDER_STATUS.IN_PROGRESS }));

      await expect(service.cancelOrder(STORE_ID, ORDER_ID, undefined, 'customer')).rejects.toThrow(ValidationError);
    });

    it('should reject direct cancel from READY (3)', async () => {
      vi.mocked(OrderCrud.getById).mockResolvedValue(createOrder({ status: ORDER_STATUS.READY }));

      await expect(service.cancelOrder(STORE_ID, ORDER_ID, undefined, 'customer')).rejects.toThrow(ValidationError);
    });
  });

  // ── requestCancellation ─────────────────────────────────────

  describe('requestCancellation', () => {
    const requestable = [ORDER_STATUS.RECEIVED, ORDER_STATUS.IN_PROGRESS, ORDER_STATUS.READY] as const;

    for (const status of requestable) {
      it(`should request cancellation from status ${status}`, async () => {
        vi.mocked(OrderCrud.getById).mockResolvedValue(createOrder({ status }));
        vi.mocked(OrderCrud.requestCancellation).mockResolvedValue(
          createOrder({ status: ORDER_STATUS.CANCELLATION_REQUESTED, source: 'storefront' }),
        );

        const result = await service.requestCancellation(STORE_ID, ORDER_ID, 'changed mind');

        expect(result.status).toBe(ORDER_STATUS.CANCELLATION_REQUESTED);
        expect(OrderCrud.requestCancellation).toHaveBeenCalledWith(STORE_ID, ORDER_ID, status, 'changed mind');
      });
    }

    it('should throw from DELIVERED (4)', async () => {
      vi.mocked(OrderCrud.getById).mockResolvedValue(createOrder({ status: ORDER_STATUS.DELIVERED }));

      await expect(service.requestCancellation(STORE_ID, ORDER_ID)).rejects.toThrow(ValidationError);
    });

    it('should throw from CANCELLED (5)', async () => {
      vi.mocked(OrderCrud.getById).mockResolvedValue(createOrder({ status: ORDER_STATUS.CANCELLED }));

      await expect(service.requestCancellation(STORE_ID, ORDER_ID)).rejects.toThrow(ValidationError);
    });

    it('should throw from CANCELLATION_REQUESTED (6)', async () => {
      vi.mocked(OrderCrud.getById).mockResolvedValue(createOrder({ status: ORDER_STATUS.CANCELLATION_REQUESTED }));

      await expect(service.requestCancellation(STORE_ID, ORDER_ID)).rejects.toThrow(ValidationError);
    });

    it('should create notification on request', async () => {
      vi.mocked(OrderCrud.getById).mockResolvedValue(createOrder({ status: ORDER_STATUS.RECEIVED }));
      vi.mocked(OrderCrud.requestCancellation).mockResolvedValue(
        createOrder({ status: ORDER_STATUS.CANCELLATION_REQUESTED, source: 'storefront' }),
      );

      await service.requestCancellation(STORE_ID, ORDER_ID, 'reason');

      expect(PgOrderNotificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          statusFrom: ORDER_STATUS.RECEIVED,
          statusTo: ORDER_STATUS.CANCELLATION_REQUESTED,
        }),
      );
    });

    it('should publish ORDER_CANCELLATION_REQUESTED event', async () => {
      vi.mocked(OrderCrud.getById).mockResolvedValue(createOrder({ status: ORDER_STATUS.RECEIVED }));
      vi.mocked(OrderCrud.requestCancellation).mockResolvedValue(
        createOrder({ status: ORDER_STATUS.CANCELLATION_REQUESTED, source: 'storefront' }),
      );

      await service.requestCancellation(STORE_ID, ORDER_ID, 'reason');

      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'order.cancellationRequested',
          payload: expect.objectContaining({
            orderId: ORDER_ID,
            storeId: STORE_ID,
            reason: 'reason',
          }),
        }),
      );
    });
  });

  // ── approveCancellationRequest ──────────────────────────────

  describe('approveCancellationRequest', () => {
    it('should approve cancellation (6 → 5)', async () => {
      vi.mocked(OrderCrud.getById).mockResolvedValue(
        createOrder({ status: ORDER_STATUS.CANCELLATION_REQUESTED, cancellationReason: 'no longer needed' }),
      );
      vi.mocked(OrderCrud.cancelOrder).mockResolvedValue(createOrder({ status: ORDER_STATUS.CANCELLED, source: 'storefront' }));

      const result = await service.approveCancellationRequest(STORE_ID, ORDER_ID);

      expect(result.status).toBe(ORDER_STATUS.CANCELLED);
      expect(OrderCrud.cancelOrder).toHaveBeenCalledWith(
        STORE_ID, ORDER_ID, ORDER_STATUS.CANCELLATION_REQUESTED, 'no longer needed',
      );
    });

    it('should throw if not in CANCELLATION_REQUESTED status', async () => {
      vi.mocked(OrderCrud.getById).mockResolvedValue(createOrder({ status: ORDER_STATUS.RECEIVED }));

      await expect(service.approveCancellationRequest(STORE_ID, ORDER_ID)).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError if order does not exist', async () => {
      vi.mocked(OrderCrud.getById).mockResolvedValue(null);

      await expect(service.approveCancellationRequest(STORE_ID, ORDER_ID)).rejects.toThrow(NotFoundError);
    });

    it('should trigger refund for paid PayPal order', async () => {
      vi.mocked(OrderCrud.getById).mockResolvedValue(
        createOrder({ status: ORDER_STATUS.CANCELLATION_REQUESTED }),
      );
      vi.mocked(OrderCrud.cancelOrder).mockResolvedValue(createOrder({ status: ORDER_STATUS.CANCELLED, source: 'storefront' }));
      vi.mocked(PaymentCrud.getByOrderId).mockResolvedValue([
        createPayment({ method: 'paypal', status: 'completed', notes: 'PayPal Transaction: CAP123' }),
      ]);

      await service.approveCancellationRequest(STORE_ID, ORDER_ID);

      expect(paypal.refundCapture).toHaveBeenCalledWith('CAP123');
      expect(PaymentCrud.refund).toHaveBeenCalled();
    });

    it('should create notification', async () => {
      vi.mocked(OrderCrud.getById).mockResolvedValue(
        createOrder({ status: ORDER_STATUS.CANCELLATION_REQUESTED }),
      );
      vi.mocked(OrderCrud.cancelOrder).mockResolvedValue(createOrder({ status: ORDER_STATUS.CANCELLED, source: 'storefront' }));

      await service.approveCancellationRequest(STORE_ID, ORDER_ID);

      expect(PgOrderNotificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          statusFrom: ORDER_STATUS.CANCELLATION_REQUESTED,
          statusTo: ORDER_STATUS.CANCELLED,
        }),
      );
    });
  });

  // ── declineCancellationRequest ──────────────────────────────

  describe('declineCancellationRequest', () => {
    it('should decline and restore previousStatus (6 → previous)', async () => {
      const restored = createOrder({ status: ORDER_STATUS.IN_PROGRESS, previousStatus: ORDER_STATUS.IN_PROGRESS, source: 'storefront' });
      vi.mocked(OrderCrud.getById).mockResolvedValue(
        createOrder({ status: ORDER_STATUS.CANCELLATION_REQUESTED }),
      );
      vi.mocked(OrderCrud.declineCancellation).mockResolvedValue(restored);

      const result = await service.declineCancellationRequest(STORE_ID, ORDER_ID);

      expect(result.status).toBe(ORDER_STATUS.IN_PROGRESS);
      expect(OrderCrud.declineCancellation).toHaveBeenCalledWith(STORE_ID, ORDER_ID);
    });

    it('should throw if not in CANCELLATION_REQUESTED status', async () => {
      vi.mocked(OrderCrud.getById).mockResolvedValue(createOrder({ status: ORDER_STATUS.RECEIVED }));

      await expect(service.declineCancellationRequest(STORE_ID, ORDER_ID)).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError if order does not exist', async () => {
      vi.mocked(OrderCrud.getById).mockResolvedValue(null);

      await expect(service.declineCancellationRequest(STORE_ID, ORDER_ID)).rejects.toThrow(NotFoundError);
    });

    it('should create notification with declined flag', async () => {
      const restored = createOrder({ status: ORDER_STATUS.IN_PROGRESS, source: 'storefront' });
      vi.mocked(OrderCrud.getById).mockResolvedValue(
        createOrder({ status: ORDER_STATUS.CANCELLATION_REQUESTED }),
      );
      vi.mocked(OrderCrud.declineCancellation).mockResolvedValue(restored);

      await service.declineCancellationRequest(STORE_ID, ORDER_ID);

      expect(PgOrderNotificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          statusFrom: ORDER_STATUS.CANCELLATION_REQUESTED,
          statusTo: ORDER_STATUS.IN_PROGRESS,
        }),
      );
    });

    it('should publish ORDER_STATUS_CHANGED event', async () => {
      const restored = createOrder({ status: ORDER_STATUS.IN_PROGRESS, source: 'storefront' });
      vi.mocked(OrderCrud.getById).mockResolvedValue(
        createOrder({ status: ORDER_STATUS.CANCELLATION_REQUESTED }),
      );
      vi.mocked(OrderCrud.declineCancellation).mockResolvedValue(restored);

      await service.declineCancellationRequest(STORE_ID, ORDER_ID);

      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'order.statusChanged',
          payload: expect.objectContaining({
            fromStatus: ORDER_STATUS.CANCELLATION_REQUESTED,
            toStatus: ORDER_STATUS.IN_PROGRESS,
          }),
        }),
      );
    });
  });

  // ── processRefundIfNeeded (via cancelOrder) ─────────────────

  describe('processRefundIfNeeded', () => {
    beforeEach(() => {
      vi.mocked(OrderCrud.getById).mockResolvedValue(createOrder({ status: ORDER_STATUS.RECEIVED }));
      vi.mocked(OrderCrud.cancelOrder).mockResolvedValue(createOrder({ status: ORDER_STATUS.CANCELLED, source: 'web' }));
    });

    it('should call PayPal refund for paypal payments', async () => {
      vi.mocked(PaymentCrud.getByOrderId).mockResolvedValue([
        createPayment({ method: 'paypal', status: 'completed', notes: 'PayPal Transaction: CAP456' }),
      ]);

      await service.cancelOrder(STORE_ID, ORDER_ID, 'test', 'owner');

      expect(paypal.refundCapture).toHaveBeenCalledWith('CAP456');
      expect(PaymentCrud.refund).toHaveBeenCalled();
    });

    it('should skip refund for cash payments', async () => {
      vi.mocked(PaymentCrud.getByOrderId).mockResolvedValue([
        createPayment({ method: 'cash', status: 'completed' }),
      ]);

      await service.cancelOrder(STORE_ID, ORDER_ID, 'test', 'owner');

      expect(paypal.refundCapture).not.toHaveBeenCalled();
      expect(PaymentCrud.refund).not.toHaveBeenCalled();
    });

    it('should skip non-completed payments', async () => {
      vi.mocked(PaymentCrud.getByOrderId).mockResolvedValue([
        createPayment({ method: 'paypal', status: 'pending' }),
      ]);

      await service.cancelOrder(STORE_ID, ORDER_ID, 'test', 'owner');

      expect(paypal.refundCapture).not.toHaveBeenCalled();
    });

    it('should mark non-cash payment as refunded after successful PayPal refund', async () => {
      const payment = createPayment({ id: 77, method: 'paypal', status: 'completed', notes: 'PayPal Transaction: CAP789' });
      vi.mocked(PaymentCrud.getByOrderId).mockResolvedValue([payment]);

      await service.cancelOrder(STORE_ID, ORDER_ID, 'test', 'owner');

      expect(PaymentCrud.refund).toHaveBeenCalledWith(STORE_ID, 77);
    });

    it('should continue processing other payments if one PayPal refund fails', async () => {
      const p1 = createPayment({ id: 10, method: 'paypal', status: 'completed', notes: 'PayPal Transaction: FAIL1' });
      const p2 = createPayment({ id: 11, method: 'paypal', status: 'completed', notes: 'PayPal Transaction: OK2' });
      vi.mocked(PaymentCrud.getByOrderId).mockResolvedValue([p1, p2]);
      paypal.refundCapture
        .mockRejectedValueOnce(new Error('PayPal error'))
        .mockResolvedValueOnce(undefined);

      await service.cancelOrder(STORE_ID, ORDER_ID, 'test', 'owner');

      // First refund failed — so refund() not called for p1
      // Second refund succeeded — refund() called for p2
      expect(PaymentCrud.refund).toHaveBeenCalledTimes(1);
      expect(PaymentCrud.refund).toHaveBeenCalledWith(STORE_ID, 11);
    });
  });
});
