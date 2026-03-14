import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ValidationError, UnauthorizedError } from '../../../src/core/errors/app-error.js';

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

// Mock google-auth-library
const mockVerifyIdToken = vi.fn();
vi.mock('google-auth-library', () => ({
  OAuth2Client: vi.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

import { StorefrontAuthService } from '../../../src/modules/storefront/storefront-auth.service.js';
import { StorefrontAuthRepository } from '../../../src/modules/storefront/storefront-auth.repository.js';

// -- Fixtures --

const GOOGLE_PAYLOAD = {
  sub: 'google-uid-12345',
  email: 'customer@gmail.com',
  given_name: 'Test',
  family_name: 'Customer',
  picture: 'https://lh3.googleusercontent.com/photo.jpg',
};

const DB_CUSTOMER_ROW = {
  id: 42,
  google_id: GOOGLE_PAYLOAD.sub,
  email: GOOGLE_PAYLOAD.email,
  first_name: GOOGLE_PAYLOAD.given_name,
  last_name: GOOGLE_PAYLOAD.family_name,
  phone: null,
  photo: GOOGLE_PAYLOAD.picture,
  created_at: '2025-06-01T00:00:00Z',
  updated_at: '2025-06-01T00:00:00Z',
};

const MAPPED_CUSTOMER = {
  id: 42,
  googleId: GOOGLE_PAYLOAD.sub,
  email: GOOGLE_PAYLOAD.email,
  firstName: GOOGLE_PAYLOAD.given_name,
  lastName: GOOGLE_PAYLOAD.family_name,
  phone: null,
  photo: GOOGLE_PAYLOAD.picture,
  createdAt: expect.any(Date),
  updatedAt: expect.any(Date),
};

function createMockFastify() {
  return {
    jwt: {
      sign: vi.fn().mockReturnValue('signed-jwt-token'),
    },
  } as any;
}

// -- Tests --

describe('StorefrontAuthService', () => {
  let service: StorefrontAuthService;
  let mockFastify: ReturnType<typeof createMockFastify>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFastify = createMockFastify();
    service = new StorefrontAuthService(mockFastify);
  });

  describe('authenticateWithGoogle', () => {
    it('should verify Google token, upsert customer, and return JWT + profile', async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => GOOGLE_PAYLOAD,
      });
      mockQuery.mockResolvedValue({ rows: [DB_CUSTOMER_ROW] });

      const result = await service.authenticateWithGoogle('valid-id-token');

      // Verify Google token was checked (audience is now an array)
      expect(mockVerifyIdToken).toHaveBeenCalledWith({
        idToken: 'valid-id-token',
        audience: expect.arrayContaining(['test-google-client-id']),
      });

      // Verify upsert query was executed with correct params (firstName, lastName, photo)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO customers'),
        [GOOGLE_PAYLOAD.sub, GOOGLE_PAYLOAD.email, GOOGLE_PAYLOAD.given_name, GOOGLE_PAYLOAD.family_name, GOOGLE_PAYLOAD.picture],
      );

      // Verify JWT was signed with correct payload (includes iss: 'storefront')
      expect(mockFastify.jwt.sign).toHaveBeenCalledWith(
        { customerId: 42, email: GOOGLE_PAYLOAD.email, type: 'storefront', iss: 'storefront' },
        { expiresIn: '7d' },
      );

      // Verify return shape
      expect(result.token).toBe('signed-jwt-token');
      expect(result.customer).toMatchObject(MAPPED_CUSTOMER);
    });

    it('should throw UnauthorizedError when Google token verification fails', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Token expired'));

      await expect(service.authenticateWithGoogle('expired-token'))
        .rejects.toThrow(UnauthorizedError);
      await expect(service.authenticateWithGoogle('expired-token'))
        .rejects.toThrow('Google token verification failed');
    });

    it('should throw ValidationError when token is missing email', async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({ sub: 'google-uid', email: undefined }),
      });

      await expect(service.authenticateWithGoogle('token-no-email'))
        .rejects.toThrow(ValidationError);
      await expect(service.authenticateWithGoogle('token-no-email'))
        .rejects.toThrow('missing email or subject');
    });

    it('should throw ValidationError when token is missing sub', async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({ sub: undefined, email: 'a@b.com' }),
      });

      await expect(service.authenticateWithGoogle('token-no-sub'))
        .rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when payload is null', async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => null,
      });

      await expect(service.authenticateWithGoogle('token-null-payload'))
        .rejects.toThrow(ValidationError);
    });

    it('should update name/photo for returning user (google_id already exists)', async () => {
      const updatedPayload = {
        ...GOOGLE_PAYLOAD,
        given_name: 'Updated',
        family_name: 'Name',
        picture: 'https://new-photo.jpg',
      };
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => updatedPayload,
      });
      const updatedRow = {
        ...DB_CUSTOMER_ROW,
        first_name: 'Updated',
        last_name: 'Name',
        photo: 'https://new-photo.jpg',
      };
      mockQuery.mockResolvedValue({ rows: [updatedRow] });

      const result = await service.authenticateWithGoogle('returning-user-token');

      // Verify ON CONFLICT was used (the upsert query)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT'),
        [GOOGLE_PAYLOAD.sub, GOOGLE_PAYLOAD.email, 'Updated', 'Name', 'https://new-photo.jpg'],
      );
      expect(result.customer.firstName).toBe('Updated');
      expect(result.customer.lastName).toBe('Name');
      expect(result.customer.photo).toBe('https://new-photo.jpg');
    });

    it('should handle Google user with no name/picture gracefully', async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({ sub: 'google-uid', email: 'a@b.com', given_name: undefined, family_name: undefined, picture: undefined }),
      });
      mockQuery.mockResolvedValue({
        rows: [{ ...DB_CUSTOMER_ROW, first_name: null, last_name: null, photo: null }],
      });

      const result = await service.authenticateWithGoogle('minimal-token');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO customers'),
        ['google-uid', 'a@b.com', null, null, null],
      );
      expect(result.customer.firstName).toBeNull();
      expect(result.customer.lastName).toBeNull();
      expect(result.customer.photo).toBeNull();
    });

    it('should produce JWT with correct fields (customerId, email, type, iss)', async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => GOOGLE_PAYLOAD,
      });
      mockQuery.mockResolvedValue({ rows: [DB_CUSTOMER_ROW] });

      await service.authenticateWithGoogle('valid-token');

      const signCall = mockFastify.jwt.sign.mock.calls[0];
      const jwtPayload = signCall[0];
      expect(jwtPayload).toEqual({
        customerId: 42,
        email: 'customer@gmail.com',
        type: 'storefront',
        iss: 'storefront',
      });
      // No storeId, userId, or storeRole in storefront token
      expect(jwtPayload).not.toHaveProperty('userId');
      expect(jwtPayload).not.toHaveProperty('storeId');
      expect(jwtPayload).not.toHaveProperty('storeRole');
    });

    it('should set JWT expiry to 7 days', async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => GOOGLE_PAYLOAD,
      });
      mockQuery.mockResolvedValue({ rows: [DB_CUSTOMER_ROW] });

      await service.authenticateWithGoogle('valid-token');

      const signCall = mockFastify.jwt.sign.mock.calls[0];
      expect(signCall[1]).toEqual({ expiresIn: '7d' });
    });

    it('should handle very long Google name/email', async () => {
      const longFirstName = 'A'.repeat(250);
      const longLastName = 'B'.repeat(250);
      const longEmail = 'a'.repeat(200) + '@example.com';
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({ sub: 'uid', email: longEmail, given_name: longFirstName, family_name: longLastName }),
      });
      mockQuery.mockResolvedValue({
        rows: [{ ...DB_CUSTOMER_ROW, first_name: longFirstName, last_name: longLastName, email: longEmail }],
      });

      const result = await service.authenticateWithGoogle('long-name-token');
      expect(result.customer.firstName).toBe(longFirstName);
      expect(result.customer.lastName).toBe(longLastName);
      expect(result.customer.email).toBe(longEmail);
    });
  });

  describe('getProfile', () => {
    it('should return customer profile by ID', async () => {
      mockQuery.mockResolvedValue({ rows: [DB_CUSTOMER_ROW] });

      const result = await service.getProfile(42);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM customers WHERE id = $1'),
        [42],
      );
      expect(result!.customer).toMatchObject(MAPPED_CUSTOMER);
    });

    it('should return null when customer not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await service.getProfile(999);

      expect(result).toBeNull();
    });
  });
});

describe('StorefrontAuthRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('upsertCustomer', () => {
    it('should insert new customer and return mapped row', async () => {
      mockQuery.mockResolvedValue({ rows: [DB_CUSTOMER_ROW] });

      const result = await StorefrontAuthRepository.upsertCustomer({
        googleId: GOOGLE_PAYLOAD.sub,
        email: GOOGLE_PAYLOAD.email,
        firstName: GOOGLE_PAYLOAD.given_name,
        lastName: GOOGLE_PAYLOAD.family_name,
        photo: GOOGLE_PAYLOAD.picture,
      });

      expect(result.id).toBe(42);
      expect(result.googleId).toBe(GOOGLE_PAYLOAD.sub);
      expect(result.email).toBe(GOOGLE_PAYLOAD.email);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should use INSERT ON CONFLICT for upsert behavior', async () => {
      mockQuery.mockResolvedValue({ rows: [DB_CUSTOMER_ROW] });

      await StorefrontAuthRepository.upsertCustomer({
        googleId: 'gid',
        email: 'e@e.com',
        firstName: null,
        lastName: null,
        photo: null,
      });

      const sql = mockQuery.mock.calls[0][0];
      expect(sql).toContain('INSERT INTO customers');
      expect(sql).toContain('ON CONFLICT (google_id) DO UPDATE');
      expect(sql).toContain('RETURNING *');
    });
  });

  describe('findById', () => {
    it('should return null when no row found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await StorefrontAuthRepository.findById(999);
      expect(result).toBeNull();
    });

    it('should return mapped customer when found', async () => {
      mockQuery.mockResolvedValue({ rows: [DB_CUSTOMER_ROW] });

      const result = await StorefrontAuthRepository.findById(42);
      expect(result!.id).toBe(42);
      expect(result!.googleId).toBe(GOOGLE_PAYLOAD.sub);
    });
  });
});
