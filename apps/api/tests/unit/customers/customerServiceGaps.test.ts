import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictError } from '../../../src/core/errors/app-error.js';
import { createCustomer } from '../helpers/mock-factories.js';

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

vi.mock('../../../src/modules/orders/orderCrud.js', () => ({
  OrderCrud: { countActiveByCustomer: vi.fn() },
}));

import { CustomerCrud } from '../../../src/modules/customers/customerCrud.js';
import { OrderCrud } from '../../../src/modules/orders/orderCrud.js';
import { CustomerService } from '../../../src/modules/customers/customer.service.js';

const STORE_ID = 1;

describe('CustomerService - Gap Coverage', () => {
  let service: CustomerService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CustomerService();
  });

  describe('delete with open orders', () => {
    it('should throw ConflictError when customer has open orders', async () => {
      vi.mocked(CustomerCrud.getById).mockResolvedValue(createCustomer());
      vi.mocked(OrderCrud.countActiveByCustomer).mockResolvedValue(3);

      await expect(service.delete(1, STORE_ID)).rejects.toThrow(ConflictError);
    });
  });

  describe('create with same customer for phone+email', () => {
    it('should not double-count when phone and email belong to same customer', async () => {
      const existing = createCustomer({ id: 5 });
      vi.mocked(CustomerCrud.findByPhone).mockResolvedValue(existing);
      vi.mocked(CustomerCrud.findByEmail).mockResolvedValue(existing); // same customer

      await expect(
        service.create(STORE_ID, { name: 'Jane', phone: '054-1234567', email: 'jane@example.com' }),
      ).rejects.toThrow(ConflictError);

      // Should have 1 conflict (phone), not 2 — email skipped because same id
    });

    it('should report both conflicts when phone and email belong to different customers', async () => {
      vi.mocked(CustomerCrud.findByPhone).mockResolvedValue(createCustomer({ id: 5 }));
      vi.mocked(CustomerCrud.findByEmail).mockResolvedValue(createCustomer({ id: 6 }));

      try {
        await service.create(STORE_ID, { name: 'Jane', phone: '054-1234567', email: 'jane@example.com' });
      } catch (err: any) {
        expect(err).toBeInstanceOf(ConflictError);
        expect(err.data.conflicts).toHaveLength(2);
      }
    });
  });

  describe('update without phone change', () => {
    it('should skip phone check when phone not in update data', async () => {
      vi.mocked(CustomerCrud.getById).mockResolvedValue(createCustomer());
      vi.mocked(CustomerCrud.update).mockResolvedValue(createCustomer({ name: 'Updated' }));

      await service.update(1, STORE_ID, { name: 'Updated' });
      expect(CustomerCrud.findByPhone).not.toHaveBeenCalled();
    });
  });
});
