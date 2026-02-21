import type { UseCase } from '../../../core/use-case.js';
import { PaymentCrud } from '../paymentCrud.js';
import type { OrderPaymentSummary, PaymentStatus } from '../payment.types.js';

export class GetPaymentSummaryUseCase implements UseCase<OrderPaymentSummary, [number, number, number]> {
  async execute(storeId: number, orderId: number, orderTotalAmount: number): Promise<OrderPaymentSummary> {
    const payments = await PaymentCrud.getByOrderId(storeId, orderId);
    const paidAmount = payments
      .filter((p) => p.status !== 'refunded')
      .reduce((sum, p) => sum + p.amount, 0);

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
