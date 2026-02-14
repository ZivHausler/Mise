import type { ICustomerRepository } from './customer.repository.js';
import type { CreateCustomerDTO, Customer, UpdateCustomerDTO } from './customer.types.js';
import { CreateCustomerUseCase } from './use-cases/createCustomer.js';
import { UpdateCustomerUseCase } from './use-cases/updateCustomer.js';
import { DeleteCustomerUseCase } from './use-cases/deleteCustomer.js';
import { NotFoundError } from '../../core/errors/app-error.js';

export class CustomerService {
  private createCustomerUseCase: CreateCustomerUseCase;
  private updateCustomerUseCase: UpdateCustomerUseCase;
  private deleteCustomerUseCase: DeleteCustomerUseCase;

  constructor(private customerRepository: ICustomerRepository) {
    this.createCustomerUseCase = new CreateCustomerUseCase(customerRepository);
    this.updateCustomerUseCase = new UpdateCustomerUseCase(customerRepository);
    this.deleteCustomerUseCase = new DeleteCustomerUseCase(customerRepository);
  }

  async getById(id: string): Promise<Customer> {
    const customer = await this.customerRepository.findById(id);
    if (!customer) throw new NotFoundError('Customer not found');
    return customer;
  }

  async getAll(search?: string): Promise<Customer[]> {
    return this.customerRepository.findAll(search);
  }

  async create(data: CreateCustomerDTO): Promise<Customer> {
    return this.createCustomerUseCase.execute(data);
  }

  async update(id: string, data: UpdateCustomerDTO): Promise<Customer> {
    return this.updateCustomerUseCase.execute(id, data);
  }

  async delete(id: string): Promise<void> {
    return this.deleteCustomerUseCase.execute(id);
  }
}
