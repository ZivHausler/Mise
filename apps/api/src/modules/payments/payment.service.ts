import type { IPaymentRepository } from './payment.repository.js';
import type { EventBus } from '../../core/events/event-bus.js';
import type { CreatePaymentDTO, Payment, OrderPaymentSummary } from './payment.types.js';
import { CreatePaymentUseCase } from './use-cases/createPayment.js';
import { GetPaymentSummaryUseCase } from './use-cases/getPaymentSummary.js';
import { DeletePaymentUseCase } from './use-cases/deletePayment.js';
import type { OrderService } from '../orders/order.service.js';
import { NotFoundError } from '../../core/errors/app-error.js';

export class PaymentService {
  private createPaymentUseCase: CreatePaymentUseCase;
  private getPaymentSummaryUseCase: GetPaymentSummaryUseCase;
  private deletePaymentUseCase: DeletePaymentUseCase;

  constructor(
    private paymentRepository: IPaymentRepository,
    private eventBus: EventBus,
    private orderService?: OrderService,
  ) {
    this.createPaymentUseCase = new CreatePaymentUseCase(paymentRepository);
    this.getPaymentSummaryUseCase = new GetPaymentSummaryUseCase(paymentRepository);
    this.deletePaymentUseCase = new DeletePaymentUseCase(paymentRepository);
  }

  async getByOrderId(orderId: string): Promise<Payment[]> {
    return this.paymentRepository.findByOrderId(orderId);
  }

  async getPaymentSummary(orderId: string): Promise<OrderPaymentSummary> {
    let orderTotal = 0;
    if (this.orderService) {
      const order = await this.orderService.getById(orderId);
      orderTotal = order.totalAmount;
    }
    return this.getPaymentSummaryUseCase.execute(orderId, orderTotal);
  }

  async create(data: CreatePaymentDTO): Promise<Payment> {
    // Verify order exists
    if (this.orderService) {
      await this.orderService.getById(data.orderId);
    }

    const payment = await this.createPaymentUseCase.execute(data);

    await this.eventBus.publish({
      eventName: 'payment.received',
      payload: { paymentId: payment.id, orderId: payment.orderId, amount: payment.amount },
      timestamp: new Date(),
    });

    return payment;
  }

  async delete(id: string): Promise<void> {
    const payment = await this.paymentRepository.findById(id);
    if (!payment) throw new NotFoundError('Payment not found');
    return this.deletePaymentUseCase.execute(id);
  }
}
