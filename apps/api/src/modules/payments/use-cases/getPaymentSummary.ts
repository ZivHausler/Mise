import type { IPaymentRepository } from '../payment.repository.js';
import type { OrderPaymentSummary, PaymentStatus } from '../payment.types.js';

export class GetPaymentSummaryUseCase {
  constructor(private paymentRepository: IPaymentRepository) {}

  async execute(orderId: string, orderTotalAmount: number): Promise<OrderPaymentSummary> {
    const payments = await this.paymentRepository.findByOrderId(orderId);
    const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0);

    let status: PaymentStatus;
    if (paidAmount <= 0) {
      status = 'unpaid';
    } else if (paidAmount >= orderTotalAmount) {
      status = 'paid';
    } else {
      status = 'partial';
    }

    return {
      orderId,
      totalAmount: orderTotalAmount,
      paidAmount,
      status,
      payments,
    };
  }
}
