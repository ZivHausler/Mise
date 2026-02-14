import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateCustomerUseCase } from '../../../src/modules/customers/use-cases/createCustomer.js';
import { createMockCustomerRepository, createCustomer } from '../helpers/mock-factories.js';
import { ValidationError } from '../../../src/core/errors/app-error.js';
import type { ICustomerRepository } from '../../../src/modules/customers/customer.repository.js';

describe('CreateCustomerUseCase', () => {
  let useCase: CreateCustomerUseCase;
  let repo: ICustomerRepository;

  beforeEach(() => {
    repo = createMockCustomerRepository();
    useCase = new CreateCustomerUseCase(repo);
  });

  it('should create a customer with valid data', async () => {
    const customer = createCustomer();
    vi.mocked(repo.create).mockResolvedValue(customer);

    const result = await useCase.execute({
      name: 'Jane Doe',
      phone: '054-1234567',
      email: 'jane@example.com',
    });

    expect(result).toEqual(customer);
    expect(repo.create).toHaveBeenCalledOnce();
  });

  it('should create a customer with minimal data (name only)', async () => {
    const customer = createCustomer({ phone: undefined, email: undefined });
    vi.mocked(repo.create).mockResolvedValue(customer);

    const result = await useCase.execute({ name: 'Minimal Customer' });

    expect(result).toEqual(customer);
  });

  it('should create a customer with preferences', async () => {
    const customer = createCustomer({
      preferences: { allergies: ['gluten', 'nuts'], favorites: ['croissant'] },
    });
    vi.mocked(repo.create).mockResolvedValue(customer);

    const result = await useCase.execute({
      name: 'Allergic Customer',
      preferences: { allergies: ['gluten', 'nuts'], favorites: ['croissant'] },
    });

    expect(result.preferences?.allergies).toEqual(['gluten', 'nuts']);
    expect(result.preferences?.favorites).toEqual(['croissant']);
  });

  it('should throw ValidationError when name is empty', async () => {
    await expect(useCase.execute({ name: '' })).rejects.toThrow(ValidationError);
    await expect(useCase.execute({ name: '   ' })).rejects.toThrow('Customer name is required');
  });

  it('should throw ValidationError for invalid email', async () => {
    await expect(
      useCase.execute({ name: 'Test', email: 'not-an-email' }),
    ).rejects.toThrow('Invalid email address');
  });

  it('should throw ValidationError for email without domain', async () => {
    await expect(
      useCase.execute({ name: 'Test', email: 'user@' }),
    ).rejects.toThrow(ValidationError);
  });

  it('should accept valid email formats', async () => {
    vi.mocked(repo.create).mockResolvedValue(createCustomer());

    await expect(
      useCase.execute({ name: 'Test', email: 'user@domain.com' }),
    ).resolves.toBeDefined();
  });

  it('should allow creating customer without email', async () => {
    vi.mocked(repo.create).mockResolvedValue(createCustomer({ email: undefined }));

    const result = await useCase.execute({ name: 'No Email Customer' });
    expect(result).toBeDefined();
    expect(repo.create).toHaveBeenCalledOnce();
  });
});
