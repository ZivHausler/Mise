import { getEventBus } from '../../core/events/event-bus.js';
import { EventNames } from '../../core/events/event-names.js';
import type { PaginationOptions, PaginatedResult, CustomerPaymentFilters, PaymentFilters } from './payment.repository.js';
import type { CreatePaymentDTO, Payment, OrderPaymentSummary, PaymentStatus } from './payment.types.js';
import { PAYMENT_STATUS } from './payment.types.js';
import { PaymentCrud } from './paymentCrud.js';
import { GetPaymentSummaryUseCase } from './use-cases/getPaymentSummary.js';
import type { OrderService } from '../orders/order.service.js';
import { ConflictError, NotFoundError } from '../../core/errors/app-error.js';
import { CustomerCrud } from '../customers/customerCrud.js';
import { ErrorCode } from '@mise/shared';

export class PaymentService {
  private getPaymentSummaryUseCase = new GetPaymentSummaryUseCase();

  constructor(private orderService?: OrderService) {}

  async getAll(storeId: number, options?: PaginationOptions, filters?: PaymentFilters): Promise<PaginatedResult<Payment>> {
    return PaymentCrud.getAll(storeId, options, filters);
  }

  async getByCustomerId(storeId: number, customerId: number, options?: PaginationOptions, filters?: CustomerPaymentFilters): Promise<PaginatedResult<Payment>> {
    return PaymentCrud.getByCustomerId(storeId, customerId, options, filters);
  }

  async getByOrderId(storeId: number, orderId: number): Promise<Payment[]> {
    return PaymentCrud.getByOrderId(storeId, orderId);
  }

  async getPaymentSummary(storeId: number, orderId: number): Promise<OrderPaymentSummary> {
    let orderTotal = 0;
    if (this.orderService) {
      const order = await this.orderService.getById(storeId, orderId);
      orderTotal = order.totalAmount;
    }
    return this.getPaymentSummaryUseCase.execute(storeId, orderId, orderTotal);
  }

  async getPaymentStatuses(storeId: number): Promise<Record<string, PaymentStatus>> {
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

  async create(storeId: number, data: CreatePaymentDTO, correlationId?: string): Promise<Payment> {
    if (this.orderService) {
      await this.orderService.getById(storeId, data.orderId);
    }

    const payment = await PaymentCrud.create(storeId, data);

    // Enrich event payload with order & customer details for notifications
    const eventPayload: Record<string, unknown> = {
      paymentId: payment.id,
      orderId: payment.order.id,
      amount: payment.amount,
      method: payment.method,
    };

    if (this.orderService) {
      const order = await this.orderService.getById(storeId, data.orderId);
      eventPayload['orderNumber'] = order.orderNumber;
      eventPayload['customerName'] = order.customer.name;

      const customer = order.customer.id ? await CustomerCrud.getById(order.customer.id, storeId) : null;
      if (customer) {
        eventPayload['customerPhone'] = customer.phone;
        eventPayload['customerEmail'] = customer.email;
      }
    }

    await getEventBus().publish({
      eventName: EventNames.PAYMENT_RECEIVED,
      payload: eventPayload,
      timestamp: new Date(),
      correlationId,
    });

    return payment;
  }

  async refund(storeId: number, id: number, correlationId?: string): Promise<Payment> {
    const payment = await PaymentCrud.getById(storeId, id);
    if (!payment) throw new NotFoundError('Payment not found', ErrorCode.PAYMENT_NOT_FOUND);
    if (payment.status === 'refunded') throw new ConflictError('Payment already refunded', ErrorCode.PAYMENT_ALREADY_REFUNDED);

    const refunded = await PaymentCrud.refund(storeId, id);

    await getEventBus().publish({
      eventName: EventNames.PAYMENT_REFUNDED,
      payload: { paymentId: refunded.id, orderId: refunded.order.id, amount: refunded.amount },
      timestamp: new Date(),
      correlationId,
    });

    return refunded;
  }

  async delete(storeId: number, id: number): Promise<void> {
    const payment = await PaymentCrud.getById(storeId, id);
    if (!payment) throw new NotFoundError('Payment not found', ErrorCode.PAYMENT_NOT_FOUND);
    return PaymentCrud.delete(storeId, id);
  }
}
