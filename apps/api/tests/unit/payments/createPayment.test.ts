import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentCrud } from '../../../src/modules/payments/paymentCrud.js';
import { createPayment } from '../helpers/mock-factories.js';

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

const STORE_ID = 1;

describe('PaymentCrud.create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a cash payment', async () => {
    const payment = createPayment({ method: 'cash' });
    vi.mocked(PgPaymentRepository.create).mockResolvedValue(payment);

    const result = await PaymentCrud.create(STORE_ID, {
      orderId: 1,
      amount: 50,
      method: 'cash',
    });

    expect(result).toEqual(payment);
    expect(result.method).toBe('cash');
    expect(PgPaymentRepository.create).toHaveBeenCalledOnce();
  });

  it('should create payment with notes', async () => {
    const payment = createPayment({ notes: 'Partial payment' });
    vi.mocked(PgPaymentRepository.create).mockResolvedValue(payment);

    const result = await PaymentCrud.create(STORE_ID, {
      orderId: 1,
      amount: 30,
      method: 'cash',
      notes: 'Partial payment',
    });

    expect(result.notes).toBe('Partial payment');
  });
});
