import type { ICustomerRepository } from '../customer.repository.js';
import type { UpdateCustomerDTO, Customer } from '../customer.types.js';
import { NotFoundError } from '../../../core/errors/app-error.js';

export class UpdateCustomerUseCase {
  constructor(private customerRepository: ICustomerRepository) {}

  async execute(id: string, data: UpdateCustomerDTO): Promise<Customer> {
    const existing = await this.customerRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Customer not found');
    }
    return this.customerRepository.update(id, data);
  }
}
