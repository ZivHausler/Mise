import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RegisterUserUseCase } from '../../../src/modules/auth/use-cases/registerUser.js';
import { createUser } from '../helpers/mock-factories.js';
import { ConflictError, ValidationError } from '../../../src/core/errors/app-error.js';

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('MOCK_BCRYPT_HASH_NOT_REAL'),
  },
}));

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

describe('RegisterUserUseCase', () => {
  let useCase: RegisterUserUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new RegisterUserUseCase();
  });

  it('should register a user with valid data', async () => {
    const newUser = createUser();
    vi.mocked(PgAuthRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(PgAuthRepository.create).mockResolvedValue(newUser);

    const result = await useCase.execute({
      email: 'baker@mise.com',
      password: 'TestPass1!fake',
      name: 'Test Baker',
    });

    expect(result).toEqual(newUser);
    expect(PgAuthRepository.findByEmail).toHaveBeenCalledWith('baker@mise.com');
    expect(PgAuthRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'baker@mise.com',
        name: 'Test Baker',
        passwordHash: 'MOCK_BCRYPT_HASH_NOT_REAL',
      }),
    );
  });

  it('should throw ConflictError when email already exists', async () => {
    vi.mocked(PgAuthRepository.findByEmail).mockResolvedValue(createUser());

    await expect(
      useCase.execute({ email: 'baker@mise.com', password: 'TestPass1!fake', name: 'Test' }),
    ).rejects.toThrow(ConflictError);
    await expect(
      useCase.execute({ email: 'baker@mise.com', password: 'TestPass1!fake', name: 'Test' }),
    ).rejects.toThrow('A user with this email already exists');
  });

  it('should throw ValidationError when password is too short', async () => {
    await expect(
      useCase.execute({ email: 'test@test.com', password: 'Short1', name: 'Test' }),
    ).rejects.toThrow(ValidationError);
    await expect(
      useCase.execute({ email: 'test@test.com', password: 'Short1', name: 'Test' }),
    ).rejects.toThrow('Password must be at least 8 characters');
  });

  it('should throw ValidationError when password has no uppercase letter', async () => {
    await expect(
      useCase.execute({ email: 'test@test.com', password: 'alllower1', name: 'Test' }),
    ).rejects.toThrow('Password must contain at least one uppercase letter');
  });

  it('should throw ValidationError when password has no number', async () => {
    await expect(
      useCase.execute({ email: 'test@test.com', password: 'NoNumberHere', name: 'Test' }),
    ).rejects.toThrow('Password must contain at least one number');
  });

  it('should not call repository when password validation fails', async () => {
    await expect(
      useCase.execute({ email: 'test@test.com', password: 'bad', name: 'Test' }),
    ).rejects.toThrow(ValidationError);

    expect(PgAuthRepository.findByEmail).not.toHaveBeenCalled();
    expect(PgAuthRepository.create).not.toHaveBeenCalled();
  });
});
