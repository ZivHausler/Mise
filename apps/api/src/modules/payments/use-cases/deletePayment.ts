import type { IPaymentRepository } from '../payment.repository.js';

export class DeletePaymentUseCase {
  constructor(private paymentRepository: IPaymentRepository) {}

  async execute(id: string): Promise<void> {
    return this.paymentRepository.delete(id);
  }
}
