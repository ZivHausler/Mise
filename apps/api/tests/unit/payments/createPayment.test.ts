import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentCrud } from '../../../src/modules/payments/crud/paymentCrud.js';
import { createPayment } from '../helpers/mock-factories.js';
import { ValidationError } from '../../../src/core/errors/app-error.js';

vi.mock('../../../src/modules/payments/payment.repository.js', () => ({
  PgPaymentRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
    findByOrderId: vi.fn(),
    findByCustomerId: vi.fn(),
    delete: vi.fn(),
  },
}));

import { PgPaymentRepository } from '../../../src/modules/payments/payment.repository.js';

const STORE_ID = 'store-1';

describe('PaymentCrud.create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a cash payment', async () => {
    const payment = createPayment({ method: 'cash' });
    vi.mocked(PgPaymentRepository.create).mockResolvedValue(payment);

    const result = await PaymentCrud.create(STORE_ID, {
      orderId: 'order-1',
      amount: 50,
      method: 'cash',
    });

    expect(result).toEqual(payment);
    expect(result.method).toBe('cash');
    expect(PgPaymentRepository.create).toHaveBeenCalledOnce();
  });

  it('should create a credit card payment', async () => {
    const payment = createPayment({ method: 'credit_card' });
    vi.mocked(PgPaymentRepository.create).mockResolvedValue(payment);

    const result = await PaymentCrud.create(STORE_ID, {
      orderId: 'order-1',
      amount: 100,
      method: 'credit_card',
    });

    expect(result.method).toBe('credit_card');
  });

  it('should throw ValidationError when amount is zero', async () => {
    await expect(
      PaymentCrud.create(STORE_ID, { orderId: 'order-1', amount: 0, method: 'cash' }),
    ).rejects.toThrow('Payment amount must be positive');
  });

  it('should throw ValidationError when amount is negative', async () => {
    await expect(
      PaymentCrud.create(STORE_ID, { orderId: 'order-1', amount: -50, method: 'cash' }),
    ).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError when orderId is missing', async () => {
    await expect(
      PaymentCrud.create(STORE_ID, { orderId: '', amount: 50, method: 'cash' }),
    ).rejects.toThrow('Order ID is required');
  });

  it('should create payment with notes', async () => {
    const payment = createPayment({ notes: 'Partial payment' });
    vi.mocked(PgPaymentRepository.create).mockResolvedValue(payment);

    const result = await PaymentCrud.create(STORE_ID, {
      orderId: 'order-1',
      amount: 30,
      method: 'cash',
      notes: 'Partial payment',
    });

    expect(result.notes).toBe('Partial payment');
  });
});
