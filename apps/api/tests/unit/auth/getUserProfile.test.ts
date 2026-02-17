import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetUserProfileUseCase } from '../../../src/modules/auth/use-cases/getUserProfile.js';
import { createUser } from '../helpers/mock-factories.js';
import { NotFoundError } from '../../../src/core/errors/app-error.js';

vi.mock('../../../src/modules/auth/auth.repository.js', () => ({
  PgAuthRepository: {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    findByGoogleId: vi.fn(),
    create: vi.fn(),
    createWithGoogle: vi.fn(),
    linkGoogle: vi.fn(),
    setPassword: vi.fn(),
    updateProfile: vi.fn(),
  },
}));

import { PgAuthRepository } from '../../../src/modules/auth/auth.repository.js';

describe('GetUserProfileUseCase', () => {
  let useCase: GetUserProfileUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new GetUserProfileUseCase();
  });

  it('should return user when found', async () => {
    const user = createUser();
    vi.mocked(PgAuthRepository.findById).mockResolvedValue(user);

    const result = await useCase.execute('user-1');

    expect(result).toEqual(user);
    expect(PgAuthRepository.findById).toHaveBeenCalledWith('user-1');
  });

  it('should throw NotFoundError when user does not exist', async () => {
    vi.mocked(PgAuthRepository.findById).mockResolvedValue(null);

    await expect(useCase.execute('nonexistent')).rejects.toThrow(NotFoundError);
    await expect(useCase.execute('nonexistent')).rejects.toThrow('User not found');
  });
});
