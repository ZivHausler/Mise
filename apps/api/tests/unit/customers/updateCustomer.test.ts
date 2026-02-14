import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateCustomerUseCase } from '../../../src/modules/customers/use-cases/updateCustomer.js';
import { createMockCustomerRepository, createCustomer } from '../helpers/mock-factories.js';
import { NotFoundError } from '../../../src/core/errors/app-error.js';
import type { ICustomerRepository } from '../../../src/modules/customers/customer.repository.js';

describe('UpdateCustomerUseCase', () => {
  let useCase: UpdateCustomerUseCase;
  let repo: ICustomerRepository;

  beforeEach(() => {
    repo = createMockCustomerRepository();
    useCase = new UpdateCustomerUseCase(repo);
  });

  it('should update an existing customer', async () => {
    const existing = createCustomer();
    const updated = createCustomer({ name: 'Jane Smith' });
    vi.mocked(repo.findById).mockResolvedValue(existing);
    vi.mocked(repo.update).mockResolvedValue(updated);

    const result = await useCase.execute('cust-1', { name: 'Jane Smith' });

    expect(result.name).toBe('Jane Smith');
    expect(repo.update).toHaveBeenCalledWith('cust-1', { name: 'Jane Smith' });
  });

  it('should throw NotFoundError when customer does not exist', async () => {
    vi.mocked(repo.findById).mockResolvedValue(null);

    await expect(
      useCase.execute('nonexistent', { name: 'X' }),
    ).rejects.toThrow(NotFoundError);
    await expect(
      useCase.execute('nonexistent', { name: 'X' }),
    ).rejects.toThrow('Customer not found');
  });

  it('should update preferences with JSONB data', async () => {
    const existing = createCustomer();
    const updated = createCustomer({
      preferences: { allergies: ['dairy'], favorites: ['baguette'] },
    });
    vi.mocked(repo.findById).mockResolvedValue(existing);
    vi.mocked(repo.update).mockResolvedValue(updated);

    const result = await useCase.execute('cust-1', {
      preferences: { allergies: ['dairy'], favorites: ['baguette'] },
    });

    expect(result.preferences?.allergies).toEqual(['dairy']);
    expect(result.preferences?.favorites).toEqual(['baguette']);
  });
});
