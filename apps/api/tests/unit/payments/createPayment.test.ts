import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreatePaymentUseCase } from '../../../src/modules/payments/use-cases/createPayment.js';
import { createMockPaymentRepository, createPayment } from '../helpers/mock-factories.js';
import { ValidationError } from '../../../src/core/errors/app-error.js';
import type { IPaymentRepository } from '../../../src/modules/payments/payment.repository.js';

describe('CreatePaymentUseCase', () => {
  let useCase: CreatePaymentUseCase;
  let repo: IPaymentRepository;

  beforeEach(() => {
    repo = createMockPaymentRepository();
    useCase = new CreatePaymentUseCase(repo);
  });

  it('should create a cash payment', async () => {
    const payment = createPayment({ method: 'cash' });
    vi.mocked(repo.create).mockResolvedValue(payment);

    const result = await useCase.execute({
      orderId: 'order-1',
      amount: 50,
      method: 'cash',
    });

    expect(result).toEqual(payment);
    expect(result.method).toBe('cash');
    expect(repo.create).toHaveBeenCalledOnce();
  });

  it('should create a credit card payment', async () => {
    const payment = createPayment({ method: 'credit_card' });
    vi.mocked(repo.create).mockResolvedValue(payment);

    const result = await useCase.execute({
      orderId: 'order-1',
      amount: 100,
      method: 'credit_card',
    });

    expect(result.method).toBe('credit_card');
  });

  it('should throw ValidationError when amount is zero', async () => {
    await expect(
      useCase.execute({ orderId: 'order-1', amount: 0, method: 'cash' }),
    ).rejects.toThrow('Payment amount must be positive');
  });

  it('should throw ValidationError when amount is negative', async () => {
    await expect(
      useCase.execute({ orderId: 'order-1', amount: -50, method: 'cash' }),
    ).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError when orderId is missing', async () => {
    await expect(
      useCase.execute({ orderId: '', amount: 50, method: 'cash' }),
    ).rejects.toThrow('Order ID is required');
  });

  it('should create payment with notes', async () => {
    const payment = createPayment({ notes: 'Partial payment' });
    vi.mocked(repo.create).mockResolvedValue(payment);

    const result = await useCase.execute({
      orderId: 'order-1',
      amount: 30,
      method: 'cash',
      notes: 'Partial payment',
    });

    expect(result.notes).toBe('Partial payment');
  });
});
