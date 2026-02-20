import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CustomerCrud } from '../../../src/modules/customers/customerCrud.js';

vi.mock('../../../src/modules/customers/customer.repository.js', () => ({
  PgCustomerRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
    findByPhone: vi.fn(),
    findByEmail: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { PgCustomerRepository } from '../../../src/modules/customers/customer.repository.js';

const STORE_ID = 'store-1';

describe('CustomerCrud.delete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete a customer', async () => {
    vi.mocked(PgCustomerRepository.delete).mockResolvedValue(undefined);

    await expect(CustomerCrud.delete('cust-1', STORE_ID)).resolves.toBeUndefined();
    expect(PgCustomerRepository.delete).toHaveBeenCalledWith('cust-1', STORE_ID);
  });
});
