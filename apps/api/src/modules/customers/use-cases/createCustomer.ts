import type { ICustomerRepository } from '../customer.repository.js';
import type { CreateCustomerDTO, Customer } from '../customer.types.js';
import { ValidationError } from '../../../core/errors/app-error.js';

export class CreateCustomerUseCase {
  constructor(private customerRepository: ICustomerRepository) {}

  async execute(data: CreateCustomerDTO): Promise<Customer> {
    if (!data.name.trim()) {
      throw new ValidationError('Customer name is required');
    }
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      throw new ValidationError('Invalid email address');
    }
    return this.customerRepository.create(data);
  }
}
