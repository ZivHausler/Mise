import { getEventBus } from '../../core/events/event-bus.js';
import { EventNames } from '../../core/events/event-names.js';
import type { PaginationOptions, PaginatedResult, CustomerPaymentFilters, PaymentFilters } from './payment.repository.js';
import type { CreatePaymentDTO, Payment, OrderPaymentSummary, PaymentStatus } from './payment.types.js';
import { PAYMENT_STATUS } from './payment.types.js';
import { PaymentCrud } from './paymentCrud.js';
import { GetPaymentSummaryUseCase } from './use-cases/getPaymentSummary.js';
import type { OrderService } from '../orders/order.service.js';
import { NotFoundError } from '../../core/errors/app-error.js';

export class PaymentService {
  private getPaymentSummaryUseCase = new GetPaymentSummaryUseCase();

  constructor(private orderService?: OrderService) {}

  async getAll(storeId: string, options?: PaginationOptions, filters?: PaymentFilters): Promise<PaginatedResult<Payment>> {
    return PaymentCrud.getAll(storeId, options, filters);
  }

  async getByCustomerId(storeId: string, customerId: string, options?: PaginationOptions, filters?: CustomerPaymentFilters): Promise<PaginatedResult<Payment>> {
    return PaymentCrud.getByCustomerId(storeId, customerId, options, filters);
  }

  async getByOrderId(storeId: string, orderId: string): Promise<Payment[]> {
    return PaymentCrud.getByOrderId(storeId, orderId);
  }

  async getPaymentSummary(storeId: string, orderId: string): Promise<OrderPaymentSummary> {
    let orderTotal = 0;
    if (this.orderService) {
      const order = await this.orderService.getById(storeId, orderId);
      orderTotal = order.totalAmount;
    }
    return this.getPaymentSummaryUseCase.execute(storeId, orderId, orderTotal);
  }

  async getPaymentStatuses(storeId: string): Promise<Record<string, PaymentStatus>> {
    const orders = this.orderService ? await this.orderService.getAll(storeId) : [];
    const paidAmounts = await PaymentCrud.getPaidAmountsByStore(storeId);
    const paidMap = new Map(paidAmounts.map((p) => [p.orderId, p.paidAmount]));

    const statuses: Record<string, PaymentStatus> = {};
    for (const order of orders) {
      const paid = paidMap.get(order.id) ?? 0;
      if (paid <= 0) statuses[order.id] = PAYMENT_STATUS.UNPAID;
      else if (paid >= order.totalAmount) statuses[order.id] = PAYMENT_STATUS.PAID;
      else statuses[order.id] = PAYMENT_STATUS.PARTIAL;
    }
    return statuses;
  }

  async create(storeId: string, data: CreatePaymentDTO, correlationId?: string): Promise<Payment> {
    if (this.orderService) {
      await this.orderService.getById(storeId, data.orderId);
    }

    const payment = await PaymentCrud.create(storeId, data);

    await getEventBus().publish({
      eventName: EventNames.PAYMENT_RECEIVED,
      payload: { paymentId: payment.id, orderId: payment.orderId, amount: payment.amount },
      timestamp: new Date(),
      correlationId,
    });

    return payment;
  }

  async refund(storeId: string, id: string, correlationId?: string): Promise<Payment> {
    const payment = await PaymentCrud.getById(storeId, id);
    if (!payment) throw new NotFoundError('Payment not found');
    if (payment.status === 'refunded') throw new NotFoundError('Payment already refunded');

    const refunded = await PaymentCrud.refund(storeId, id);

    await getEventBus().publish({
      eventName: EventNames.PAYMENT_REFUNDED,
      payload: { paymentId: refunded.id, orderId: refunded.orderId, amount: refunded.amount },
      timestamp: new Date(),
      correlationId,
    });

    return refunded;
  }

  async delete(storeId: string, id: string): Promise<void> {
    const payment = await PaymentCrud.getById(storeId, id);
    if (!payment) throw new NotFoundError('Payment not found');
    return PaymentCrud.delete(storeId, id);
  }
}
