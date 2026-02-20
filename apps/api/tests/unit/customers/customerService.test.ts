import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CustomerService } from '../../../src/modules/customers/customer.service.js';
import { createCustomer } from '../helpers/mock-factories.js';
import { NotFoundError, ConflictError } from '../../../src/core/errors/app-error.js';

vi.mock('../../../src/modules/customers/customerCrud.js', () => ({
  CustomerCrud: {
    create: vi.fn(),
    getById: vi.fn(),
    getAll: vi.fn(),
    findByPhone: vi.fn(),
    findByEmail: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { CustomerCrud } from '../../../src/modules/customers/customerCrud.js';

const STORE_ID = 'store-1';

describe('CustomerService', () => {
  let service: CustomerService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CustomerService();
  });

  describe('getById', () => {
    it('should return customer when found', async () => {
      const customer = createCustomer();
      vi.mocked(CustomerCrud.getById).mockResolvedValue(customer);

      const result = await service.getById('cust-1', STORE_ID);
      expect(result).toEqual(customer);
      expect(CustomerCrud.getById).toHaveBeenCalledWith('cust-1', STORE_ID);
    });

    it('should throw NotFoundError when customer not found', async () => {
      vi.mocked(CustomerCrud.getById).mockResolvedValue(null);

      await expect(service.getById('nonexistent', STORE_ID)).rejects.toThrow(NotFoundError);
    });
  });

  describe('getAll', () => {
    it('should return all customers', async () => {
      const customers = [createCustomer({ id: 'c1' }), createCustomer({ id: 'c2' })];
      vi.mocked(CustomerCrud.getAll).mockResolvedValue(customers);

      const result = await service.getAll(STORE_ID);
      expect(result).toHaveLength(2);
    });

    it('should pass search parameter', async () => {
      vi.mocked(CustomerCrud.getAll).mockResolvedValue([]);

      await service.getAll(STORE_ID, 'jane');
      expect(CustomerCrud.getAll).toHaveBeenCalledWith(STORE_ID, 'jane');
    });
  });

  describe('create', () => {
    it('should create a customer when no duplicates exist', async () => {
      const customer = createCustomer();
      vi.mocked(CustomerCrud.findByPhone).mockResolvedValue(null);
      vi.mocked(CustomerCrud.findByEmail).mockResolvedValue(null);
      vi.mocked(CustomerCrud.create).mockResolvedValue(customer);

      const result = await service.create(STORE_ID, {
        name: 'Jane Doe',
        phone: '054-1234567',
        email: 'jane@example.com',
      });

      expect(result).toEqual(customer);
    });

    it('should throw ConflictError when phone already exists', async () => {
      vi.mocked(CustomerCrud.findByPhone).mockResolvedValue(createCustomer());

      await expect(
        service.create(STORE_ID, { name: 'Jane', phone: '054-1234567' }),
      ).rejects.toThrow(ConflictError);
    });

    it('should throw ConflictError when email already exists', async () => {
      vi.mocked(CustomerCrud.findByPhone).mockResolvedValue(null);
      vi.mocked(CustomerCrud.findByEmail).mockResolvedValue(createCustomer());

      await expect(
        service.create(STORE_ID, { name: 'Jane', phone: '054-0000000', email: 'jane@example.com' }),
      ).rejects.toThrow(ConflictError);
    });

    it('should skip email check when no email provided', async () => {
      vi.mocked(CustomerCrud.findByPhone).mockResolvedValue(null);
      vi.mocked(CustomerCrud.create).mockResolvedValue(createCustomer());

      await service.create(STORE_ID, { name: 'Jane', phone: '054-1234567' });
      expect(CustomerCrud.findByEmail).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update customer when found and no conflicts', async () => {
      const customer = createCustomer();
      vi.mocked(CustomerCrud.getById).mockResolvedValue(customer);
      vi.mocked(CustomerCrud.findByPhone).mockResolvedValue(null);
      vi.mocked(CustomerCrud.update).mockResolvedValue({ ...customer, name: 'Updated' });

      const result = await service.update('cust-1', STORE_ID, { name: 'Updated', phone: '054-9999999' });
      expect(result.name).toBe('Updated');
    });

    it('should throw NotFoundError when customer not found', async () => {
      vi.mocked(CustomerCrud.getById).mockResolvedValue(null);

      await expect(service.update('nonexistent', STORE_ID, { name: 'x' })).rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError when phone conflicts with another customer', async () => {
      vi.mocked(CustomerCrud.getById).mockResolvedValue(createCustomer());
      vi.mocked(CustomerCrud.findByPhone).mockResolvedValue(createCustomer({ id: 'other' }));

      await expect(
        service.update('cust-1', STORE_ID, { phone: '054-9999999' }),
      ).rejects.toThrow(ConflictError);
    });

    it('should throw ConflictError when email conflicts with another customer', async () => {
      vi.mocked(CustomerCrud.getById).mockResolvedValue(createCustomer());
      vi.mocked(CustomerCrud.findByEmail).mockResolvedValue(createCustomer({ id: 'other' }));

      await expect(
        service.update('cust-1', STORE_ID, { email: 'taken@example.com' }),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('delete', () => {
    it('should delete an existing customer', async () => {
      vi.mocked(CustomerCrud.getById).mockResolvedValue(createCustomer());
      vi.mocked(CustomerCrud.delete).mockResolvedValue(undefined);

      await expect(service.delete('cust-1', STORE_ID)).resolves.toBeUndefined();
    });

    it('should throw NotFoundError when customer not found', async () => {
      vi.mocked(CustomerCrud.getById).mockResolvedValue(null);

      await expect(service.delete('nonexistent', STORE_ID)).rejects.toThrow(NotFoundError);
    });
  });
});
