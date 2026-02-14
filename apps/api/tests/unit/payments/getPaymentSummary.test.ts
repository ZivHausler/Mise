import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetPaymentSummaryUseCase } from '../../../src/modules/payments/use-cases/getPaymentSummary.js';
import { createMockPaymentRepository, createPayment } from '../helpers/mock-factories.js';
import type { IPaymentRepository } from '../../../src/modules/payments/payment.repository.js';

describe('GetPaymentSummaryUseCase', () => {
  let useCase: GetPaymentSummaryUseCase;
  let repo: IPaymentRepository;

  beforeEach(() => {
    repo = createMockPaymentRepository();
    useCase = new GetPaymentSummaryUseCase(repo);
  });

  it('should return unpaid status when no payments exist', async () => {
    vi.mocked(repo.findByOrderId).mockResolvedValue([]);

    const result = await useCase.execute('order-1', 100);

    expect(result.status).toBe('unpaid');
    expect(result.paidAmount).toBe(0);
    expect(result.totalAmount).toBe(100);
    expect(result.payments).toEqual([]);
  });

  it('should return partial status when partially paid', async () => {
    vi.mocked(repo.findByOrderId).mockResolvedValue([
      createPayment({ amount: 30 }),
    ]);

    const result = await useCase.execute('order-1', 100);

    expect(result.status).toBe('partial');
    expect(result.paidAmount).toBe(30);
  });

  it('should return paid status when fully paid', async () => {
    vi.mocked(repo.findByOrderId).mockResolvedValue([
      createPayment({ id: 'p1', amount: 60 }),
      createPayment({ id: 'p2', amount: 40 }),
    ]);

    const result = await useCase.execute('order-1', 100);

    expect(result.status).toBe('paid');
    expect(result.paidAmount).toBe(100);
  });

  it('should return paid status when overpaid', async () => {
    vi.mocked(repo.findByOrderId).mockResolvedValue([
      createPayment({ amount: 120 }),
    ]);

    const result = await useCase.execute('order-1', 100);

    expect(result.status).toBe('paid');
    expect(result.paidAmount).toBe(120);
  });

  it('should sum multiple payments correctly', async () => {
    vi.mocked(repo.findByOrderId).mockResolvedValue([
      createPayment({ id: 'p1', amount: 25 }),
      createPayment({ id: 'p2', amount: 25 }),
      createPayment({ id: 'p3', amount: 25 }),
    ]);

    const result = await useCase.execute('order-1', 100);

    expect(result.paidAmount).toBe(75);
    expect(result.status).toBe('partial');
    expect(result.payments).toHaveLength(3);
  });

  it('should include payment details in summary', async () => {
    const payments = [
      createPayment({ id: 'p1', amount: 50, method: 'cash' }),
      createPayment({ id: 'p2', amount: 50, method: 'credit_card' }),
    ];
    vi.mocked(repo.findByOrderId).mockResolvedValue(payments);

    const result = await useCase.execute('order-1', 100);

    expect(result.payments).toHaveLength(2);
    expect(result.orderId).toBe('order-1');
  });

  it('should handle zero total amount (free order)', async () => {
    vi.mocked(repo.findByOrderId).mockResolvedValue([]);

    const result = await useCase.execute('order-1', 0);

    // paidAmount (0) <= 0, so status is 'unpaid' per the logic
    expect(result.status).toBe('unpaid');
    expect(result.totalAmount).toBe(0);
  });

  it('should return paid when single payment covers exact amount', async () => {
    vi.mocked(repo.findByOrderId).mockResolvedValue([
      createPayment({ amount: 100 }),
    ]);

    const result = await useCase.execute('order-1', 100);

    expect(result.status).toBe('paid');
    expect(result.paidAmount).toBe(100);
  });
});
