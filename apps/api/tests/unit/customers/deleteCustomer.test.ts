import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteCustomerUseCase } from '../../../src/modules/customers/use-cases/deleteCustomer.js';
import { createMockCustomerRepository, createCustomer } from '../helpers/mock-factories.js';
import { NotFoundError } from '../../../src/core/errors/app-error.js';
import type { ICustomerRepository } from '../../../src/modules/customers/customer.repository.js';

describe('DeleteCustomerUseCase', () => {
  let useCase: DeleteCustomerUseCase;
  let repo: ICustomerRepository;

  beforeEach(() => {
    repo = createMockCustomerRepository();
    useCase = new DeleteCustomerUseCase(repo);
  });

  it('should delete an existing customer', async () => {
    vi.mocked(repo.findById).mockResolvedValue(createCustomer());
    vi.mocked(repo.delete).mockResolvedValue(undefined);

    await expect(useCase.execute('cust-1')).resolves.toBeUndefined();
    expect(repo.delete).toHaveBeenCalledWith('cust-1');
  });

  it('should throw NotFoundError when customer does not exist', async () => {
    vi.mocked(repo.findById).mockResolvedValue(null);

    await expect(useCase.execute('nonexistent')).rejects.toThrow(NotFoundError);
  });
});
