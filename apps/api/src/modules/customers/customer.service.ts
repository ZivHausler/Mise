import type { CreateCustomerDTO, Customer, UpdateCustomerDTO } from './customer.types.js';
import { CustomerCrud } from './customerCrud.js';
import { ConflictError, NotFoundError } from '../../core/errors/app-error.js';

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
    // Uniqueness checks – collect all conflicts before throwing
    const conflicts: { field: 'phone' | 'email'; customerId: string }[] = [];

    const existingByPhone = await CustomerCrud.findByPhone(storeId, data.phone);
    if (existingByPhone) {
      conflicts.push({ field: 'phone', customerId: existingByPhone.id });
    }
    if (data.email) {
      const existingByEmail = await CustomerCrud.findByEmail(storeId, data.email);
      // Only add as separate conflict if it's a different customer than the phone match
      if (existingByEmail && existingByEmail.id !== existingByPhone?.id) {
        conflicts.push({ field: 'email', customerId: existingByEmail.id });
      }
    }

    if (conflicts.length > 0) {
      throw new ConflictError(
        'A customer with this contact info already exists',
        'CUSTOMER_CONFLICT',
        { conflicts },
      );
    }

    return CustomerCrud.create(storeId, data);
  }

  async update(id: string, storeId: string, data: UpdateCustomerDTO): Promise<Customer> {
    const existing = await CustomerCrud.getById(id, storeId);
    if (!existing) {
      throw new NotFoundError('Customer not found');
    }
    // Uniqueness checks – collect all conflicts before throwing
    const conflicts: { field: 'phone' | 'email'; customerId: string }[] = [];

    const existingByPhone = data.phone !== undefined
      ? await CustomerCrud.findByPhone(storeId, data.phone, id)
      : null;
    if (existingByPhone) {
      conflicts.push({ field: 'phone', customerId: existingByPhone.id });
    }
    if (data.email) {
      const existingByEmail = await CustomerCrud.findByEmail(storeId, data.email, id);
      if (existingByEmail && existingByEmail.id !== existingByPhone?.id) {
        conflicts.push({ field: 'email', customerId: existingByEmail.id });
      }
    }

    if (conflicts.length > 0) {
      throw new ConflictError(
        'A customer with this contact info already exists',
        'CUSTOMER_CONFLICT',
        { conflicts },
      );
    }
    return CustomerCrud.update(id, storeId, data);
  }

  async delete(id: string, storeId: string): Promise<void> {
    const existing = await CustomerCrud.getById(id, storeId);
    if (!existing) {
      throw new NotFoundError('Customer not found');
    }
    return CustomerCrud.delete(id, storeId);
  }
}
