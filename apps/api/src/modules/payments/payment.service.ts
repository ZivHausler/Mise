import { getEventBus } from '../../core/events/event-bus.js';
import type { PaginationOptions, PaginatedResult, CustomerPaymentFilters } from './payment.repository.js';
import type { CreatePaymentDTO, Payment, OrderPaymentSummary } from './payment.types.js';
import { PaymentCrud } from './paymentCrud.js';
import { GetPaymentSummaryUseCase } from './use-cases/getPaymentSummary.js';
import type { OrderService } from '../orders/order.service.js';
import { NotFoundError } from '../../core/errors/app-error.js';

export class PaymentService {
  private getPaymentSummaryUseCase = new GetPaymentSummaryUseCase();

  constructor(private orderService?: OrderService) {}

  async getAll(storeId: string, options?: PaginationOptions): Promise<PaginatedResult<Payment>> {
    return PaymentCrud.getAll(storeId, options);
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

  async create(storeId: string, data: CreatePaymentDTO): Promise<Payment> {
    if (this.orderService) {
      await this.orderService.getById(storeId, data.orderId);
    }

    const payment = await PaymentCrud.create(storeId, data);

    await getEventBus().publish({
      eventName: 'payment.received',
      payload: { paymentId: payment.id, orderId: payment.orderId, amount: payment.amount },
      timestamp: new Date(),
    });

    return payment;
  }

  async delete(storeId: string, id: string): Promise<void> {
    const payment = await PaymentCrud.getById(storeId, id);
    if (!payment) throw new NotFoundError('Payment not found');
    return PaymentCrud.delete(storeId, id);
  }
}
