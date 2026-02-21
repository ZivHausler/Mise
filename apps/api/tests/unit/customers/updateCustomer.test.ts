import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CustomerCrud } from '../../../src/modules/customers/customerCrud.js';
import { createCustomer } from '../helpers/mock-factories.js';

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

const STORE_ID = 1;

describe('CustomerCrud.update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update an existing customer', async () => {
    const updated = createCustomer({ name: 'Jane Smith' });
    vi.mocked(PgCustomerRepository.update).mockResolvedValue(updated);

    const result = await CustomerCrud.update(1, STORE_ID, { name: 'Jane Smith' });

    expect(result.name).toBe('Jane Smith');
    expect(PgCustomerRepository.update).toHaveBeenCalledWith(1, STORE_ID, { name: 'Jane Smith' });
  });

  it('should update preferences with JSONB data', async () => {
    const updated = createCustomer({
      preferences: { allergies: ['dairy'], favorites: ['baguette'] },
    });
    vi.mocked(PgCustomerRepository.update).mockResolvedValue(updated);

    const result = await CustomerCrud.update(1, STORE_ID, {
      preferences: { allergies: ['dairy'], favorites: ['baguette'] },
    });

    expect(result.preferences?.allergies).toEqual(['dairy']);
    expect(result.preferences?.favorites).toEqual(['baguette']);
  });
});
