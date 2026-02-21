import { PgCustomerRepository } from './customer.repository.js';
import type { CreateCustomerDTO, Customer, UpdateCustomerDTO } from './customer.types.js';

export class CustomerCrud {
  static async create(storeId: number, data: CreateCustomerDTO): Promise<Customer> {
    return PgCustomerRepository.create(storeId, data);
  }

  static async getById(id: number, storeId: number): Promise<Customer | null> {
    return PgCustomerRepository.findById(id, storeId);
  }

  static async getAll(storeId: number, search?: string): Promise<Customer[]> {
    return PgCustomerRepository.findAll(storeId, search);
  }

  static async findByPhone(storeId: number, phone: string, excludeId?: number): Promise<Customer | null> {
    return PgCustomerRepository.findByPhone(storeId, phone, excludeId);
  }

  static async findByEmail(storeId: number, email: string, excludeId?: number): Promise<Customer | null> {
    return PgCustomerRepository.findByEmail(storeId, email, excludeId);
  }

  static async update(id: number, storeId: number, data: UpdateCustomerDTO): Promise<Customer> {
    return PgCustomerRepository.update(id, storeId, data);
  }

  static async delete(id: number, storeId: number): Promise<void> {
    return PgCustomerRepository.delete(id, storeId);
  }
}
