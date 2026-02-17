import { PgCustomerRepository } from './customer.repository.js';
import type { CreateCustomerDTO, Customer, UpdateCustomerDTO } from './customer.types.js';
import { ConflictError, NotFoundError, ValidationError } from '../../core/errors/app-error.js';

export class CustomerCrud {
  static async create(storeId: string, data: CreateCustomerDTO): Promise<Customer> {
    if (!data.name.trim()) {
      throw new ValidationError('Customer name is required');
    }
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      throw new ValidationError('Invalid email address');
    }
    if (!data.phone?.trim()) {
      throw new ValidationError('Phone number is required');
    }
    const existingByPhone = await PgCustomerRepository.findByPhone(storeId, data.phone);
    if (existingByPhone) {
      throw new ConflictError('A customer with this phone number already exists', 'CUSTOMER_PHONE_EXISTS', { existingCustomerId: existingByPhone.id });
    }
    if (data.email) {
      const existingByEmail = await PgCustomerRepository.findByEmail(storeId, data.email);
      if (existingByEmail) {
        throw new ConflictError('A customer with this email already exists', 'CUSTOMER_EMAIL_EXISTS', { existingCustomerId: existingByEmail.id });
      }
    }
    return PgCustomerRepository.create(storeId, data);
  }

  static async getById(id: string, storeId: string): Promise<Customer | null> {
    return PgCustomerRepository.findById(id, storeId);
  }

  static async getAll(storeId: string, search?: string): Promise<Customer[]> {
    return PgCustomerRepository.findAll(storeId, search);
  }

  static async update(id: string, storeId: string, data: UpdateCustomerDTO): Promise<Customer> {
    const existing = await PgCustomerRepository.findById(id, storeId);
    if (!existing) {
      throw new NotFoundError('Customer not found');
    }
    if (data.phone !== undefined) {
      if (!data.phone.trim()) {
        throw new ValidationError('Phone number is required');
      }
      const existingByPhone = await PgCustomerRepository.findByPhone(storeId, data.phone, id);
      if (existingByPhone) {
        throw new ConflictError('A customer with this phone number already exists', 'CUSTOMER_PHONE_EXISTS', { existingCustomerId: existingByPhone.id });
      }
    }
    if (data.email) {
      const existingByEmail = await PgCustomerRepository.findByEmail(storeId, data.email, id);
      if (existingByEmail) {
        throw new ConflictError('A customer with this email already exists', 'CUSTOMER_EMAIL_EXISTS', { existingCustomerId: existingByEmail.id });
      }
    }
    return PgCustomerRepository.update(id, storeId, data);
  }

  static async delete(id: string, storeId: string): Promise<void> {
    const existing = await PgCustomerRepository.findById(id, storeId);
    if (!existing) {
      throw new NotFoundError('Customer not found');
    }
    return PgCustomerRepository.delete(id, storeId);
  }
}
