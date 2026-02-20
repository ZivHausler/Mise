import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentCrud } from '../../../src/modules/payments/paymentCrud.js';

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

describe('PaymentCrud.delete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete a payment', async () => {
    vi.mocked(PgPaymentRepository.delete).mockResolvedValue(undefined);

    await expect(PaymentCrud.delete(STORE_ID, 'pay-1')).resolves.toBeUndefined();
    expect(PgPaymentRepository.delete).toHaveBeenCalledWith(STORE_ID, 'pay-1');
  });
});
