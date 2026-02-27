import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictError, UnauthorizedError, ValidationError } from '../../../src/core/errors/app-error.js';
import { createUser } from '../helpers/mock-factories.js';

vi.mock('../../../src/modules/auth/auth.repository.js', () => ({
  PgAuthRepository: {
    findByGoogleId: vi.fn(),
    findByEmail: vi.fn(),
    createWithGoogle: vi.fn(),
    linkGoogle: vi.fn(),
    setPassword: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock('../../../src/config/env.js', () => ({
  env: { GOOGLE_CLIENT_ID: 'test-client-id' },
}));

// Mock OAuth2Client
const mockVerifyIdToken = vi.fn();
vi.mock('google-auth-library', () => ({
  OAuth2Client: vi.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

vi.mock('bcrypt', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

import bcrypt from 'bcrypt';
import { PgAuthRepository } from '../../../src/modules/auth/auth.repository.js';
import { GoogleAuthUseCase } from '../../../src/modules/auth/use-cases/googleAuth.js';
import { GoogleRegisterUseCase } from '../../../src/modules/auth/use-cases/googleRegister.js';
import { MergeGoogleAccountUseCase } from '../../../src/modules/auth/use-cases/mergeGoogleAccount.js';
import { MergeEmailToGoogleUseCase } from '../../../src/modules/auth/use-cases/mergeEmailToGoogle.js';

function mockGooglePayload(overrides?: Record<string, unknown>) {
  return {
    getPayload: () => ({
      email: 'baker@mise.com',
      name: 'Test Baker',
      sub: 'google-id-123',
      ...overrides,
    }),
  };
}

describe('GoogleAuthUseCase', () => {
  let useCase: GoogleAuthUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new GoogleAuthUseCase();
  });

  it('should return user when already linked to Google', async () => {
    const user = createUser({ googleId: 'google-id-123' });
    mockVerifyIdToken.mockResolvedValue(mockGooglePayload());
    vi.mocked(PgAuthRepository.findByGoogleId).mockResolvedValue(user);

    const result = await useCase.execute('valid-id-token');
    expect(result).toEqual(user);
  });

  it('should throw ValidationError for invalid token payload', async () => {
    mockVerifyIdToken.mockResolvedValue({ getPayload: () => null });

    await expect(useCase.execute('bad-token')).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError when email missing from payload', async () => {
    mockVerifyIdToken.mockResolvedValue({ getPayload: () => ({ sub: '123' }) });

    await expect(useCase.execute('bad-token')).rejects.toThrow(ValidationError);
  });

  it('should throw ConflictError when email exists with password but no Google', async () => {
    mockVerifyIdToken.mockResolvedValue(mockGooglePayload());
    vi.mocked(PgAuthRepository.findByGoogleId).mockResolvedValue(null);
    vi.mocked(PgAuthRepository.findByEmail).mockResolvedValue(
      createUser({ passwordHash: 'hash', googleId: undefined }),
    );

    await expect(useCase.execute('valid-token')).rejects.toThrow(ConflictError);
  });

  it('should throw UnauthorizedError when no user found (invitation-only)', async () => {
    mockVerifyIdToken.mockResolvedValue(mockGooglePayload());
    vi.mocked(PgAuthRepository.findByGoogleId).mockResolvedValue(null);
    vi.mocked(PgAuthRepository.findByEmail).mockResolvedValue(null);

    await expect(useCase.execute('valid-token')).rejects.toThrow(UnauthorizedError);
  });
});

describe('GoogleRegisterUseCase', () => {
  let useCase: GoogleRegisterUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new GoogleRegisterUseCase();
  });

  it('should create new user with Google', async () => {
    const newUser = createUser({ googleId: 'google-id-123' });
    mockVerifyIdToken.mockResolvedValue(mockGooglePayload());
    vi.mocked(PgAuthRepository.findByGoogleId).mockResolvedValue(null);
    vi.mocked(PgAuthRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(PgAuthRepository.createWithGoogle).mockResolvedValue(newUser);

    const result = await useCase.execute('valid-token');
    expect(result).toEqual(newUser);
  });

  it('should throw ConflictError when Google account already exists', async () => {
    mockVerifyIdToken.mockResolvedValue(mockGooglePayload());
    vi.mocked(PgAuthRepository.findByGoogleId).mockResolvedValue(createUser());

    await expect(useCase.execute('valid-token')).rejects.toThrow(ConflictError);
  });

  it('should throw ConflictError when email already exists', async () => {
    mockVerifyIdToken.mockResolvedValue(mockGooglePayload());
    vi.mocked(PgAuthRepository.findByGoogleId).mockResolvedValue(null);
    vi.mocked(PgAuthRepository.findByEmail).mockResolvedValue(createUser());

    await expect(useCase.execute('valid-token')).rejects.toThrow(ConflictError);
  });

  it('should use email prefix as name when name not in payload', async () => {
    mockVerifyIdToken.mockResolvedValue(mockGooglePayload({ name: undefined, email: 'baker@mise.com' }));
    vi.mocked(PgAuthRepository.findByGoogleId).mockResolvedValue(null);
    vi.mocked(PgAuthRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(PgAuthRepository.createWithGoogle).mockResolvedValue(createUser());

    await useCase.execute('valid-token');
    expect(PgAuthRepository.createWithGoogle).toHaveBeenCalledWith(expect.objectContaining({
      name: 'baker',
    }));
  });
});

describe('MergeGoogleAccountUseCase', () => {
  let useCase: MergeGoogleAccountUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new MergeGoogleAccountUseCase();
  });

  it('should link Google to existing email account with valid password', async () => {
    const user = createUser({ passwordHash: '$2b$10$hash' });
    const linkedUser = createUser({ googleId: 'google-id-123' });
    mockVerifyIdToken.mockResolvedValue(mockGooglePayload());
    vi.mocked(PgAuthRepository.findByEmail).mockResolvedValue(user);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    vi.mocked(PgAuthRepository.linkGoogle).mockResolvedValue(linkedUser);

    const result = await useCase.execute('valid-token', 'correct-password');
    expect(result.googleId).toBe('google-id-123');
  });

  it('should throw UnauthorizedError when user not found', async () => {
    mockVerifyIdToken.mockResolvedValue(mockGooglePayload());
    vi.mocked(PgAuthRepository.findByEmail).mockResolvedValue(null);

    await expect(useCase.execute('valid-token', 'password')).rejects.toThrow(UnauthorizedError);
  });

  it('should throw UnauthorizedError for wrong password', async () => {
    mockVerifyIdToken.mockResolvedValue(mockGooglePayload());
    vi.mocked(PgAuthRepository.findByEmail).mockResolvedValue(createUser({ passwordHash: 'hash' }));
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    await expect(useCase.execute('valid-token', 'wrong-password')).rejects.toThrow(UnauthorizedError);
  });

  it('should throw UnauthorizedError when user has no password', async () => {
    mockVerifyIdToken.mockResolvedValue(mockGooglePayload());
    vi.mocked(PgAuthRepository.findByEmail).mockResolvedValue(createUser({ passwordHash: undefined }));

    await expect(useCase.execute('valid-token', 'password')).rejects.toThrow(UnauthorizedError);
  });
});

describe('MergeEmailToGoogleUseCase', () => {
  let useCase: MergeEmailToGoogleUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new MergeEmailToGoogleUseCase();
  });

  it('should set password for Google-only account', async () => {
    const user = createUser({ googleId: 'google-id-123', passwordHash: undefined });
    const updated = createUser({ googleId: 'google-id-123', passwordHash: 'new-hash' });
    mockVerifyIdToken.mockResolvedValue(mockGooglePayload());
    vi.mocked(PgAuthRepository.findByGoogleId).mockResolvedValue(user);
    vi.mocked(bcrypt.hash).mockResolvedValue('new-hash' as never);
    vi.mocked(PgAuthRepository.setPassword).mockResolvedValue(updated);

    const result = await useCase.execute('valid-token', 'StrongPass1');
    expect(result.passwordHash).toBe('new-hash');
  });

  it('should throw UnauthorizedError when no Google account found', async () => {
    mockVerifyIdToken.mockResolvedValue(mockGooglePayload());
    vi.mocked(PgAuthRepository.findByGoogleId).mockResolvedValue(null);

    await expect(useCase.execute('valid-token', 'StrongPass1')).rejects.toThrow(UnauthorizedError);
  });

  it('should throw ValidationError when account already has password', async () => {
    mockVerifyIdToken.mockResolvedValue(mockGooglePayload());
    vi.mocked(PgAuthRepository.findByGoogleId).mockResolvedValue(createUser({ passwordHash: 'existing' }));

    await expect(useCase.execute('valid-token', 'StrongPass1')).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError for password shorter than 8 chars', async () => {
    mockVerifyIdToken.mockResolvedValue(mockGooglePayload());
    vi.mocked(PgAuthRepository.findByGoogleId).mockResolvedValue(createUser({ passwordHash: undefined }));

    await expect(useCase.execute('valid-token', 'Short1')).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError for password without uppercase', async () => {
    mockVerifyIdToken.mockResolvedValue(mockGooglePayload());
    vi.mocked(PgAuthRepository.findByGoogleId).mockResolvedValue(createUser({ passwordHash: undefined }));

    await expect(useCase.execute('valid-token', 'alllower1')).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError for password without number', async () => {
    mockVerifyIdToken.mockResolvedValue(mockGooglePayload());
    vi.mocked(PgAuthRepository.findByGoogleId).mockResolvedValue(createUser({ passwordHash: undefined }));

    await expect(useCase.execute('valid-token', 'NoNumberHere')).rejects.toThrow(ValidationError);
  });
});
