import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteOrderUseCase } from '../../../src/modules/orders/use-cases/deleteOrder.js';
import { createMockOrderRepository, createOrder } from '../helpers/mock-factories.js';
import { NotFoundError, ValidationError } from '../../../src/core/errors/app-error.js';
import type { IOrderRepository } from '../../../src/modules/orders/order.repository.js';

describe('DeleteOrderUseCase', () => {
  let useCase: DeleteOrderUseCase;
  let repo: IOrderRepository;

  beforeEach(() => {
    repo = createMockOrderRepository();
    useCase = new DeleteOrderUseCase(repo);
  });

  it('should delete an order with received status', async () => {
    vi.mocked(repo.findById).mockResolvedValue(createOrder({ status: 'received' }));
    vi.mocked(repo.delete).mockResolvedValue(undefined);

    await expect(useCase.execute('order-1')).resolves.toBeUndefined();
    expect(repo.delete).toHaveBeenCalledWith('order-1');
  });

  it('should throw NotFoundError when order does not exist', async () => {
    vi.mocked(repo.findById).mockResolvedValue(null);

    await expect(useCase.execute('nonexistent')).rejects.toThrow(NotFoundError);
  });

  it('should throw ValidationError when order is in_progress', async () => {
    vi.mocked(repo.findById).mockResolvedValue(createOrder({ status: 'in_progress' }));

    await expect(useCase.execute('order-1')).rejects.toThrow(ValidationError);
    await expect(useCase.execute('order-1')).rejects.toThrow('Can only delete orders with "received" status');
  });

  it('should throw ValidationError when order is ready', async () => {
    vi.mocked(repo.findById).mockResolvedValue(createOrder({ status: 'ready' }));

    await expect(useCase.execute('order-1')).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError when order is delivered', async () => {
    vi.mocked(repo.findById).mockResolvedValue(createOrder({ status: 'delivered' }));

    await expect(useCase.execute('order-1')).rejects.toThrow(ValidationError);
  });
});
