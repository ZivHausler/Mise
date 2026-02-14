import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeletePaymentUseCase } from '../../../src/modules/payments/use-cases/deletePayment.js';
import { createMockPaymentRepository } from '../helpers/mock-factories.js';
import type { IPaymentRepository } from '../../../src/modules/payments/payment.repository.js';

describe('DeletePaymentUseCase', () => {
  let useCase: DeletePaymentUseCase;
  let repo: IPaymentRepository;

  beforeEach(() => {
    repo = createMockPaymentRepository();
    useCase = new DeletePaymentUseCase(repo);
  });

  it('should delete a payment', async () => {
    vi.mocked(repo.delete).mockResolvedValue(undefined);

    await expect(useCase.execute('pay-1')).resolves.toBeUndefined();
    expect(repo.delete).toHaveBeenCalledWith('pay-1');
  });
});
