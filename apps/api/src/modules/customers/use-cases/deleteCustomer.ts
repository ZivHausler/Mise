import type { ICustomerRepository } from '../customer.repository.js';
import { NotFoundError } from '../../../core/errors/app-error.js';

export class DeleteCustomerUseCase {
  constructor(private customerRepository: ICustomerRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.customerRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Customer not found');
    }
    return this.customerRepository.delete(id);
  }
}
