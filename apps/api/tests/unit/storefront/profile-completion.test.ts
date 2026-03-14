import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ValidationError, NotFoundError } from '../../../src/core/errors/app-error.js';

// -- Mocks --

const mockQuery = vi.fn();
vi.mock('../../../src/core/database/postgres.js', () => ({
  getPool: () => ({ query: mockQuery }),
}));

vi.mock('../../../src/config/env.js', () => ({
  env: {
    GOOGLE_CLIENT_ID: 'test-google-client-id',
  },
}));

// Mock google-auth-library (required by StorefrontAuthService constructor)
vi.mock('google-auth-library', () => ({
  OAuth2Client: vi.fn().mockImplementation(() => ({
    verifyIdToken: vi.fn(),
  })),
}));

import { StorefrontAuthService } from '../../../src/modules/storefront/storefront-auth.service.js';
import { StorefrontAuthRepository } from '../../../src/modules/storefront/storefront-auth.repository.js';
import { updateProfileSchema } from '../../../src/modules/storefront/storefront.schemas.js';

// -- Fixtures --

function makeCustomerRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    google_id: 'google-uid-123',
    email: 'test@gmail.com',
    first_name: 'John',
    last_name: 'Doe',
    phone: '+972501234567',
    photo: 'https://photo.url/pic.jpg',
    created_at: '2025-06-01T00:00:00Z',
    updated_at: '2025-06-01T00:00:00Z',
    ...overrides,
  };
}

function createMockFastify() {
  return {
    jwt: {
      sign: vi.fn().mockReturnValue('signed-jwt-token'),
    },
  } as any;
}

// -- Tests --

describe('Phone Normalization', () => {
  let service: StorefrontAuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new StorefrontAuthService(createMockFastify());
  });

  // Access private normalizePhone via updateProfile (which calls it internally)
  // We test through the service's updateProfile method which normalizes phone before saving

  async function normalizePhone(phone: string): Promise<string> {
    mockQuery.mockResolvedValue({
      rows: [makeCustomerRow({ phone })],
    });
    // Call updateProfile which internally calls normalizePhone
    // We intercept the query call to see what normalized value was passed
    await service.updateProfile(1, { phone });
    const queryCall = mockQuery.mock.calls[0];
    const params = queryCall[1];
    // The first param is the normalized phone (first SET clause value)
    return params[0] as string;
  }

  it('should normalize 0501234567 to +972501234567', async () => {
    const result = await normalizePhone('0501234567');
    expect(result).toBe('+972501234567');
  });

  it('should normalize 501234567 to +972501234567', async () => {
    const result = await normalizePhone('501234567');
    expect(result).toBe('+972501234567');
  });

  it('should normalize 972501234567 to +972501234567', async () => {
    const result = await normalizePhone('972501234567');
    expect(result).toBe('+972501234567');
  });

  it('should keep +972501234567 as +972501234567 (already normalized)', async () => {
    const result = await normalizePhone('+972501234567');
    expect(result).toBe('+972501234567');
  });

  it('should normalize 00972501234567 to +972501234567', async () => {
    const result = await normalizePhone('00972501234567');
    expect(result).toBe('+972501234567');
  });

  it('should normalize 050-123-4567 (with dashes) to +972501234567', async () => {
    const result = await normalizePhone('050-123-4567');
    expect(result).toBe('+972501234567');
  });

  it('should normalize 050 123 4567 (with spaces) to +972501234567', async () => {
    const result = await normalizePhone('050 123 4567');
    expect(result).toBe('+972501234567');
  });

  it('should throw ValidationError for too-short number (1234567)', async () => {
    await expect(service.updateProfile(1, { phone: '1234567' }))
      .rejects.toThrow(ValidationError);
    await expect(service.updateProfile(1, { phone: '1234567' }))
      .rejects.toThrow('Invalid phone number');
  });

  it('should throw ValidationError for number starting with 8 (0801234567)', async () => {
    await expect(service.updateProfile(1, { phone: '0801234567' }))
      .rejects.toThrow(ValidationError);
  });

  it('should normalize 0701234567 to +972701234567 (07x mobile)', async () => {
    const result = await normalizePhone('0701234567');
    expect(result).toBe('+972701234567');
  });

  it('should throw ValidationError for landline number (021234567)', async () => {
    await expect(service.updateProfile(1, { phone: '021234567' }))
      .rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError for empty string phone', async () => {
    // Empty string after stripping non-digits = 0 digits
    await expect(service.updateProfile(1, { phone: '' }))
      .rejects.toThrow(ValidationError);
  });
});

describe('isProfileComplete logic', () => {
  let service: StorefrontAuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new StorefrontAuthService(createMockFastify());
  });

  it('should return true when all fields are present', async () => {
    mockQuery.mockResolvedValue({
      rows: [makeCustomerRow({
        first_name: 'John',
        last_name: 'Doe',
        phone: '+972501234567',
      })],
    });

    const result = await service.getProfile(1);
    expect(result!.isProfileComplete).toBe(true);
  });

  it('should return false when firstName is missing (null)', async () => {
    mockQuery.mockResolvedValue({
      rows: [makeCustomerRow({ first_name: null })],
    });

    const result = await service.getProfile(1);
    expect(result!.isProfileComplete).toBe(false);
  });

  it('should return false when lastName is missing (null)', async () => {
    mockQuery.mockResolvedValue({
      rows: [makeCustomerRow({ last_name: null })],
    });

    const result = await service.getProfile(1);
    expect(result!.isProfileComplete).toBe(false);
  });

  it('should return false when phone is missing (null)', async () => {
    mockQuery.mockResolvedValue({
      rows: [makeCustomerRow({ phone: null })],
    });

    const result = await service.getProfile(1);
    expect(result!.isProfileComplete).toBe(false);
  });

  it('should return false when firstName is an empty string', async () => {
    mockQuery.mockResolvedValue({
      rows: [makeCustomerRow({ first_name: '' })],
    });

    const result = await service.getProfile(1);
    expect(result!.isProfileComplete).toBe(false);
  });

  it('should return false when phone is an empty string', async () => {
    mockQuery.mockResolvedValue({
      rows: [makeCustomerRow({ phone: '' })],
    });

    const result = await service.getProfile(1);
    expect(result!.isProfileComplete).toBe(false);
  });

  it('should return false when firstName is whitespace-only', async () => {
    mockQuery.mockResolvedValue({
      rows: [makeCustomerRow({ first_name: '   ' })],
    });

    const result = await service.getProfile(1);
    expect(result!.isProfileComplete).toBe(false);
  });

  it('should return false when all fields are missing', async () => {
    mockQuery.mockResolvedValue({
      rows: [makeCustomerRow({
        first_name: null,
        last_name: null,
        phone: null,
      })],
    });

    const result = await service.getProfile(1);
    expect(result!.isProfileComplete).toBe(false);
  });

  it('should return null when customer does not exist', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const result = await service.getProfile(999);
    expect(result).toBeNull();
  });
});

describe('updateProfileSchema (Zod validation)', () => {
  it('should accept valid partial update with firstName only', () => {
    const result = updateProfileSchema.parse({ firstName: 'John' });
    expect(result.firstName).toBe('John');
    expect(result.lastName).toBeUndefined();
    expect(result.phone).toBeUndefined();
  });

  it('should accept valid full update', () => {
    const result = updateProfileSchema.parse({
      firstName: 'John',
      lastName: 'Doe',
      phone: '0501234567',
    });
    expect(result.firstName).toBe('John');
    expect(result.lastName).toBe('Doe');
    expect(result.phone).toBe('0501234567');
  });

  it('should accept lastName only', () => {
    const result = updateProfileSchema.parse({ lastName: 'Doe' });
    expect(result.lastName).toBe('Doe');
  });

  it('should accept phone only', () => {
    const result = updateProfileSchema.parse({ phone: '0501234567' });
    expect(result.phone).toBe('0501234567');
  });

  it('should reject empty object (at least one field required)', () => {
    expect(() => updateProfileSchema.parse({})).toThrow();
  });

  it('should reject firstName as empty string (min 1 char)', () => {
    expect(() => updateProfileSchema.parse({ firstName: '' })).toThrow();
  });

  it('should reject lastName as empty string (min 1 char)', () => {
    expect(() => updateProfileSchema.parse({ lastName: '' })).toThrow();
  });

  it('should reject phone shorter than 9 characters', () => {
    expect(() => updateProfileSchema.parse({ phone: '12345678' })).toThrow();
  });

  it('should reject phone longer than 15 characters', () => {
    expect(() => updateProfileSchema.parse({ phone: '1234567890123456' })).toThrow();
  });

  it('should reject firstName longer than 100 characters', () => {
    expect(() => updateProfileSchema.parse({ firstName: 'A'.repeat(101) })).toThrow();
  });

  it('should trim firstName whitespace', () => {
    const result = updateProfileSchema.parse({ firstName: '  John  ' });
    expect(result.firstName).toBe('John');
  });

  it('should trim lastName whitespace', () => {
    const result = updateProfileSchema.parse({ lastName: '  Doe  ' });
    expect(result.lastName).toBe('Doe');
  });
});

describe('Profile update flow', () => {
  let service: StorefrontAuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new StorefrontAuthService(createMockFastify());
  });

  it('should update only provided fields (partial update)', async () => {
    mockQuery.mockResolvedValue({
      rows: [makeCustomerRow({ first_name: 'Jane', last_name: 'Doe', phone: '+972501234567' })],
    });

    await service.updateProfile(1, { firstName: 'Jane' });

    const sql = mockQuery.mock.calls[0][0] as string;
    // Should SET first_name but NOT last_name or phone
    expect(sql).toContain('first_name');
    expect(sql).not.toContain('last_name');
    expect(sql).not.toContain('phone =');
    expect(sql).toContain('updated_at');
  });

  it('should update multiple fields when provided', async () => {
    mockQuery.mockResolvedValue({
      rows: [makeCustomerRow({ first_name: 'Jane', last_name: 'Smith' })],
    });

    await service.updateProfile(1, { firstName: 'Jane', lastName: 'Smith' });

    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain('first_name');
    expect(sql).toContain('last_name');
  });

  it('should return isProfileComplete correctly after partial update (still incomplete)', async () => {
    mockQuery.mockResolvedValue({
      rows: [makeCustomerRow({ first_name: 'Jane', last_name: null, phone: null })],
    });

    const result = await service.updateProfile(1, { firstName: 'Jane' });
    expect(result.isProfileComplete).toBe(false);
  });

  it('should return isProfileComplete true after completing all fields', async () => {
    mockQuery.mockResolvedValue({
      rows: [makeCustomerRow({
        first_name: 'Jane',
        last_name: 'Doe',
        phone: '+972501234567',
      })],
    });

    const result = await service.updateProfile(1, {
      firstName: 'Jane',
      lastName: 'Doe',
      phone: '0501234567',
    });
    expect(result.isProfileComplete).toBe(true);
  });

  it('should throw NotFoundError for non-existent customer ID', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await expect(service.updateProfile(999, { firstName: 'Ghost' }))
      .rejects.toThrow(NotFoundError);
    await expect(service.updateProfile(999, { firstName: 'Ghost' }))
      .rejects.toThrow('Customer not found');
  });

  it('should normalize phone before saving to database', async () => {
    mockQuery.mockResolvedValue({
      rows: [makeCustomerRow({ phone: '+972501234567' })],
    });

    await service.updateProfile(1, { phone: '050-123-4567' });

    const params = mockQuery.mock.calls[0][1];
    // First param should be the normalized phone
    expect(params[0]).toBe('+972501234567');
  });

  it('should pass customer ID as the last query parameter', async () => {
    mockQuery.mockResolvedValue({
      rows: [makeCustomerRow()],
    });

    await service.updateProfile(42, { firstName: 'Jane', phone: '0501234567' });

    const params = mockQuery.mock.calls[0][1];
    // Last param is always the customer ID
    expect(params[params.length - 1]).toBe(42);
  });
});

describe('StorefrontAuthRepository.updateProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should build dynamic SET clause for single field', async () => {
    mockQuery.mockResolvedValue({ rows: [makeCustomerRow()] });

    await StorefrontAuthRepository.updateProfile(1, { firstName: 'Alice' });

    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain('UPDATE customers SET');
    expect(sql).toContain('first_name = $1');
    expect(sql).toContain('WHERE id = $2');
    expect(mockQuery.mock.calls[0][1]).toEqual(['Alice', 1]);
  });

  it('should build dynamic SET clause for all three fields', async () => {
    mockQuery.mockResolvedValue({ rows: [makeCustomerRow()] });

    await StorefrontAuthRepository.updateProfile(1, {
      firstName: 'Alice',
      lastName: 'Wonder',
      phone: '+972501234567',
    });

    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain('first_name = $1');
    expect(sql).toContain('last_name = $2');
    expect(sql).toContain('phone = $3');
    expect(sql).toContain('WHERE id = $4');
    expect(mockQuery.mock.calls[0][1]).toEqual(['Alice', 'Wonder', '+972501234567', 1]);
  });

  it('should throw NotFoundError when no row is returned', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await expect(StorefrontAuthRepository.updateProfile(999, { firstName: 'Ghost' }))
      .rejects.toThrow(NotFoundError);
  });

  it('should return mapped customer on success', async () => {
    mockQuery.mockResolvedValue({ rows: [makeCustomerRow()] });

    const result = await StorefrontAuthRepository.updateProfile(1, { firstName: 'Alice' });

    expect(result.id).toBe(1);
    expect(result.googleId).toBe('google-uid-123');
    expect(result.firstName).toBe('John');
    expect(result.createdAt).toBeInstanceOf(Date);
  });
});
