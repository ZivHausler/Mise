import type { CreateCustomerDTO, Customer, UpdateCustomerDTO } from './customer.types.js';
import type { CustomerSegment } from '../loyalty/loyalty.types.js';
import { CustomerCrud } from './customerCrud.js';
import { PgCustomerRepository } from './customer.repository.js';
import { LoyaltyService } from '../loyalty/loyalty.service.js';
import { OrderCrud } from '../orders/orderCrud.js';
import { ConflictError, NotFoundError } from '../../core/errors/app-error.js';
import { ErrorCode } from '@mise/shared';

export class CustomerService {
  async getById(id: number, storeId: number): Promise<Customer> {
    const customer = await CustomerCrud.getById(id, storeId);
    if (!customer) throw new NotFoundError('Customer not found', ErrorCode.CUSTOMER_NOT_FOUND);
    return customer;
  }

  async getAll(storeId: number, search?: string, segment?: CustomerSegment): Promise<Customer[]> {
    if (segment) {
      const loyaltyService = new LoyaltyService();
      const config = await loyaltyService.getFullConfig(storeId);
      return PgCustomerRepository.findAllWithSegment(storeId, config, segment, search);
    }
    return CustomerCrud.getAll(storeId, search);
  }

  async create(storeId: number, data: CreateCustomerDTO): Promise<Customer> {
    // Uniqueness checks – collect all conflicts before throwing
    const conflicts: { field: 'phone' | 'email'; customerId: number }[] = [];

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
        ErrorCode.CUSTOMER_CONFLICT,
        { conflicts },
      );
    }

    return CustomerCrud.create(storeId, data);
  }

  async update(id: number, storeId: number, data: UpdateCustomerDTO): Promise<Customer> {
    const existing = await CustomerCrud.getById(id, storeId);
    if (!existing) {
      throw new NotFoundError('Customer not found', ErrorCode.CUSTOMER_NOT_FOUND);
    }
    // Uniqueness checks – collect all conflicts before throwing
    const conflicts: { field: 'phone' | 'email'; customerId: number }[] = [];

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
        ErrorCode.CUSTOMER_CONFLICT,
        { conflicts },
      );
    }
    return CustomerCrud.update(id, storeId, data);
  }

  async delete(id: number, storeId: number): Promise<void> {
    const existing = await CustomerCrud.getById(id, storeId);
    if (!existing) {
      throw new NotFoundError('Customer not found', ErrorCode.CUSTOMER_NOT_FOUND);
    }
    const openOrders = await OrderCrud.countActiveByCustomer(storeId, id);
    if (openOrders > 0) {
      throw new ConflictError('Customer has open orders', ErrorCode.CUSTOMER_HAS_OPEN_ORDERS);
    }
    return CustomerCrud.delete(id, storeId);
  }
}
