import type { IPaymentRepository } from '../payment.repository.js';
import type { CreatePaymentDTO, Payment } from '../payment.types.js';
import { ValidationError } from '../../../core/errors/app-error.js';

export class CreatePaymentUseCase {
  constructor(private paymentRepository: IPaymentRepository) {}

  async execute(data: CreatePaymentDTO): Promise<Payment> {
    if (data.amount <= 0) {
      throw new ValidationError('Payment amount must be positive');
    }
    if (!data.orderId) {
      throw new ValidationError('Order ID is required');
    }
    return this.paymentRepository.create(data);
  }
}
