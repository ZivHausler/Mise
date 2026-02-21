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

describe('CustomerCrud.create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a customer with valid data', async () => {
    const customer = createCustomer();
    vi.mocked(PgCustomerRepository.create).mockResolvedValue(customer);

    const result = await CustomerCrud.create(STORE_ID, {
      name: 'Jane Doe',
      phone: '054-1234567',
      email: 'jane@example.com',
    });

    expect(result).toEqual(customer);
    expect(PgCustomerRepository.create).toHaveBeenCalledOnce();
  });

  it('should create a customer with minimal data (name only)', async () => {
    const customer = createCustomer({ phone: undefined, email: undefined });
    vi.mocked(PgCustomerRepository.create).mockResolvedValue(customer);

    const result = await CustomerCrud.create(STORE_ID, { name: 'Minimal Customer' });

    expect(result).toEqual(customer);
  });

  it('should create a customer with preferences', async () => {
    const customer = createCustomer({
      preferences: { allergies: ['gluten', 'nuts'], favorites: ['croissant'] },
    });
    vi.mocked(PgCustomerRepository.create).mockResolvedValue(customer);

    const result = await CustomerCrud.create(STORE_ID, {
      name: 'Allergic Customer',
      preferences: { allergies: ['gluten', 'nuts'], favorites: ['croissant'] },
    });

    expect(result.preferences?.allergies).toEqual(['gluten', 'nuts']);
    expect(result.preferences?.favorites).toEqual(['croissant']);
  });

  it('should accept valid email formats', async () => {
    vi.mocked(PgCustomerRepository.create).mockResolvedValue(createCustomer());

    await expect(
      CustomerCrud.create(STORE_ID, { name: 'Test', email: 'user@domain.com' }),
    ).resolves.toBeDefined();
  });

  it('should allow creating customer without email', async () => {
    vi.mocked(PgCustomerRepository.create).mockResolvedValue(createCustomer({ email: undefined }));

    const result = await CustomerCrud.create(STORE_ID, { name: 'No Email Customer' });
    expect(result).toBeDefined();
    expect(PgCustomerRepository.create).toHaveBeenCalledOnce();
  });
});
