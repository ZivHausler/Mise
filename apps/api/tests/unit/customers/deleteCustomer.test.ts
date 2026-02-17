import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CustomerCrud } from '../../../src/modules/customers/crud/customerCrud.js';
import { createCustomer } from '../helpers/mock-factories.js';
import { NotFoundError } from '../../../src/core/errors/app-error.js';

vi.mock('../../../src/modules/customers/customer.repository.js', () => ({
  PgCustomerRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
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

  it('should delete an existing customer', async () => {
    vi.mocked(PgCustomerRepository.findById).mockResolvedValue(createCustomer());
    vi.mocked(PgCustomerRepository.delete).mockResolvedValue(undefined);

    await expect(CustomerCrud.delete('cust-1', STORE_ID)).resolves.toBeUndefined();
    expect(PgCustomerRepository.delete).toHaveBeenCalledWith('cust-1', STORE_ID);
  });

  it('should throw NotFoundError when customer does not exist', async () => {
    vi.mocked(PgCustomerRepository.findById).mockResolvedValue(null);

    await expect(CustomerCrud.delete('nonexistent', STORE_ID)).rejects.toThrow(NotFoundError);
  });
});
