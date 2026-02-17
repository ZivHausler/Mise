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

describe('CustomerCrud.update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update an existing customer', async () => {
    const existing = createCustomer();
    const updated = createCustomer({ name: 'Jane Smith' });
    vi.mocked(PgCustomerRepository.findById).mockResolvedValue(existing);
    vi.mocked(PgCustomerRepository.update).mockResolvedValue(updated);

    const result = await CustomerCrud.update('cust-1', STORE_ID, { name: 'Jane Smith' });

    expect(result.name).toBe('Jane Smith');
    expect(PgCustomerRepository.update).toHaveBeenCalledWith('cust-1', STORE_ID, { name: 'Jane Smith' });
  });

  it('should throw NotFoundError when customer does not exist', async () => {
    vi.mocked(PgCustomerRepository.findById).mockResolvedValue(null);

    await expect(
      CustomerCrud.update('nonexistent', STORE_ID, { name: 'X' }),
    ).rejects.toThrow(NotFoundError);
    await expect(
      CustomerCrud.update('nonexistent', STORE_ID, { name: 'X' }),
    ).rejects.toThrow('Customer not found');
  });

  it('should update preferences with JSONB data', async () => {
    const existing = createCustomer();
    const updated = createCustomer({
      preferences: { allergies: ['dairy'], favorites: ['baguette'] },
    });
    vi.mocked(PgCustomerRepository.findById).mockResolvedValue(existing);
    vi.mocked(PgCustomerRepository.update).mockResolvedValue(updated);

    const result = await CustomerCrud.update('cust-1', STORE_ID, {
      preferences: { allergies: ['dairy'], favorites: ['baguette'] },
    });

    expect(result.preferences?.allergies).toEqual(['dairy']);
    expect(result.preferences?.favorites).toEqual(['baguette']);
  });
});
