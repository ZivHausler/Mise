import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoginUserUseCase } from '../../../src/modules/auth/use-cases/loginUser.js';
import { createMockAuthRepository, createUser } from '../helpers/mock-factories.js';
import { UnauthorizedError } from '../../../src/core/errors/app-error.js';
import type { IAuthRepository } from '../../../src/modules/auth/auth.repository.js';

vi.mock('bcrypt', () => ({
  default: {
    compare: vi.fn(),
  },
}));

import bcrypt from 'bcrypt';

describe('LoginUserUseCase', () => {
  let useCase: LoginUserUseCase;
  let repo: IAuthRepository;

  beforeEach(() => {
    repo = createMockAuthRepository();
    useCase = new LoginUserUseCase(repo);
    vi.clearAllMocks();
  });

  it('should return user for valid credentials', async () => {
    const user = createUser();
    vi.mocked(repo.findByEmail).mockResolvedValue(user);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const result = await useCase.execute({ email: 'baker@mise.com', password: 'TestPass1!fake' });

    expect(result).toEqual(user);
    expect(repo.findByEmail).toHaveBeenCalledWith('baker@mise.com');
  });

  it('should throw UnauthorizedError when user does not exist', async () => {
    vi.mocked(repo.findByEmail).mockResolvedValue(null);

    await expect(
      useCase.execute({ email: 'unknown@mise.com', password: 'pass' }),
    ).rejects.toThrow(UnauthorizedError);
    await expect(
      useCase.execute({ email: 'unknown@mise.com', password: 'pass' }),
    ).rejects.toThrow('Invalid email or password');
  });

  it('should throw UnauthorizedError when password is wrong', async () => {
    vi.mocked(repo.findByEmail).mockResolvedValue(createUser());
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    await expect(
      useCase.execute({ email: 'baker@mise.com', password: 'WrongPass1' }),
    ).rejects.toThrow(UnauthorizedError);
  });

  it('should use the same error message for wrong email and wrong password', async () => {
    // Non-existent user
    vi.mocked(repo.findByEmail).mockResolvedValue(null);
    const err1 = await useCase.execute({ email: 'x@x.com', password: 'p' }).catch((e) => e);

    // Wrong password
    vi.mocked(repo.findByEmail).mockResolvedValue(createUser());
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);
    const err2 = await useCase.execute({ email: 'baker@mise.com', password: 'wrong' }).catch((e) => e);

    expect(err1.message).toBe(err2.message);
    expect(err1.message).toBe('Invalid email or password');
  });
});
