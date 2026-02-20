import { PgCustomerRepository } from './customer.repository.js';
import type { CreateCustomerDTO, Customer, UpdateCustomerDTO } from './customer.types.js';

export class CustomerCrud {
  static async create(storeId: string, data: CreateCustomerDTO): Promise<Customer> {
    return PgCustomerRepository.create(storeId, data);
  }

  static async getById(id: string, storeId: string): Promise<Customer | null> {
    return PgCustomerRepository.findById(id, storeId);
  }

  static async getAll(storeId: string, search?: string): Promise<Customer[]> {
    return PgCustomerRepository.findAll(storeId, search);
  }

  static async findByPhone(storeId: string, phone: string, excludeId?: string): Promise<Customer | null> {
    return PgCustomerRepository.findByPhone(storeId, phone, excludeId);
  }

  static async findByEmail(storeId: string, email: string, excludeId?: string): Promise<Customer | null> {
    return PgCustomerRepository.findByEmail(storeId, email, excludeId);
  }

  static async update(id: string, storeId: string, data: UpdateCustomerDTO): Promise<Customer> {
    return PgCustomerRepository.update(id, storeId, data);
  }

  static async delete(id: string, storeId: string): Promise<void> {
    return PgCustomerRepository.delete(id, storeId);
  }
}
