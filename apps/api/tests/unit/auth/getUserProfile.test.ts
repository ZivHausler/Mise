import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetUserProfileUseCase } from '../../../src/modules/auth/use-cases/getUserProfile.js';
import { createMockAuthRepository, createUser } from '../helpers/mock-factories.js';
import { NotFoundError } from '../../../src/core/errors/app-error.js';
import type { IAuthRepository } from '../../../src/modules/auth/auth.repository.js';

describe('GetUserProfileUseCase', () => {
  let useCase: GetUserProfileUseCase;
  let repo: IAuthRepository;

  beforeEach(() => {
    repo = createMockAuthRepository();
    useCase = new GetUserProfileUseCase(repo);
  });

  it('should return user when found', async () => {
    const user = createUser();
    vi.mocked(repo.findById).mockResolvedValue(user);

    const result = await useCase.execute('user-1');

    expect(result).toEqual(user);
    expect(repo.findById).toHaveBeenCalledWith('user-1');
  });

  it('should throw NotFoundError when user does not exist', async () => {
    vi.mocked(repo.findById).mockResolvedValue(null);

    await expect(useCase.execute('nonexistent')).rejects.toThrow(NotFoundError);
    await expect(useCase.execute('nonexistent')).rejects.toThrow('User not found');
  });
});
