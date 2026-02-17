import type { CreateCustomerDTO, Customer, UpdateCustomerDTO } from './customer.types.js';
import { CustomerCrud } from './customerCrud.js';
import { NotFoundError } from '../../core/errors/app-error.js';

export class CustomerService {
  async getById(id: string, storeId: string): Promise<Customer> {
    const customer = await CustomerCrud.getById(id, storeId);
    if (!customer) throw new NotFoundError('Customer not found');
    return customer;
  }

  async getAll(storeId: string, search?: string): Promise<Customer[]> {
    return CustomerCrud.getAll(storeId, search);
  }

  async create(storeId: string, data: CreateCustomerDTO): Promise<Customer> {
    return CustomerCrud.create(storeId, data);
  }

  async update(id: string, storeId: string, data: UpdateCustomerDTO): Promise<Customer> {
    return CustomerCrud.update(id, storeId, data);
  }

  async delete(id: string, storeId: string): Promise<void> {
    return CustomerCrud.delete(id, storeId);
  }
}
