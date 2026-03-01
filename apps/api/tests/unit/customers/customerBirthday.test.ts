import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PgCustomerRepository } from '../../../src/modules/customers/customer.repository.js';

// Mock the database pool
const mockQuery = vi.fn();
vi.mock('../../../src/core/database/postgres.js', () => ({
  getPool: () => ({
    query: mockQuery,
  }),
}));

// Also mock the loyalty repository since customer.repository imports it
vi.mock('../../../src/modules/loyalty/loyalty.repository.js', () => ({
  PgLoyaltyRepository: {
    buildSegmentCTE: vi.fn().mockReturnValue('mock_cte'),
    getSegmentCTEParams: vi.fn().mockReturnValue([1, 10, 90, 3, 90, 30, 60]),
  },
}));

const STORE_ID = 1;

describe('PgCustomerRepository - Birthday Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create - birthday normalization', () => {
    it('should normalize birthday to year 2000', async () => {
      const returnedRow = {
        id: 1,
        name: 'Alice',
        phone: '054-1111111',
        email: null,
        address: null,
        notes: null,
        preferences: null,
        birthday: '2000-03-15',
        loyalty_enabled: true,
        loyalty_tier: 'bronze',
        store_id: STORE_ID,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };
      mockQuery.mockResolvedValue({ rows: [returnedRow] });

      await PgCustomerRepository.create(STORE_ID, {
        name: 'Alice',
        phone: '054-1111111',
        birthday: '1990-03-15',
      });

      // Check the birthday parameter passed to the query
      const queryCall = mockQuery.mock.calls[0];
      const params = queryCall[1];
      // birthday is the 8th parameter (index 7)
      expect(params[7]).toBe('2000-03-15');
    });

    it('should pass null when birthday is null', async () => {
      const returnedRow = {
        id: 1,
        name: 'Bob',
        phone: '054-2222222',
        email: null,
        address: null,
        notes: null,
        preferences: null,
        birthday: null,
        loyalty_enabled: true,
        loyalty_tier: 'bronze',
        store_id: STORE_ID,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };
      mockQuery.mockResolvedValue({ rows: [returnedRow] });

      await PgCustomerRepository.create(STORE_ID, {
        name: 'Bob',
        phone: '054-2222222',
        birthday: null,
      });

      const params = mockQuery.mock.calls[0][1];
      expect(params[7]).toBeNull();
    });

    it('should pass null when birthday is undefined', async () => {
      const returnedRow = {
        id: 1,
        name: 'Carol',
        phone: '054-3333333',
        email: null,
        address: null,
        notes: null,
        preferences: null,
        birthday: null,
        loyalty_enabled: true,
        loyalty_tier: 'bronze',
        store_id: STORE_ID,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };
      mockQuery.mockResolvedValue({ rows: [returnedRow] });

      await PgCustomerRepository.create(STORE_ID, {
        name: 'Carol',
        phone: '054-3333333',
      });

      const params = mockQuery.mock.calls[0][1];
      expect(params[7]).toBeNull();
    });

    it('should handle Feb 29 birthday by normalizing to year 2000 (leap year)', async () => {
      const returnedRow = {
        id: 1,
        name: 'Dave',
        phone: '054-4444444',
        email: null,
        address: null,
        notes: null,
        preferences: null,
        birthday: '2000-02-29',
        loyalty_enabled: true,
        loyalty_tier: 'bronze',
        store_id: STORE_ID,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };
      mockQuery.mockResolvedValue({ rows: [returnedRow] });

      await PgCustomerRepository.create(STORE_ID, {
        name: 'Dave',
        phone: '054-4444444',
        birthday: '1996-02-29',
      });

      const params = mockQuery.mock.calls[0][1];
      // Year 2000 is a leap year, so Feb 29 is valid
      expect(params[7]).toBe('2000-02-29');
    });

    it('should normalize any year to 2000', async () => {
      const returnedRow = {
        id: 1,
        name: 'Eve',
        phone: '054-5555555',
        email: null,
        address: null,
        notes: null,
        preferences: null,
        birthday: '2000-12-25',
        loyalty_enabled: true,
        loyalty_tier: 'bronze',
        store_id: STORE_ID,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };
      mockQuery.mockResolvedValue({ rows: [returnedRow] });

      await PgCustomerRepository.create(STORE_ID, {
        name: 'Eve',
        phone: '054-5555555',
        birthday: '2005-12-25',
      });

      const params = mockQuery.mock.calls[0][1];
      expect(params[7]).toBe('2000-12-25');
    });
  });

  describe('update - birthday normalization', () => {
    it('should normalize birthday to year 2000 on update', async () => {
      const returnedRow = {
        id: 1,
        name: 'Alice',
        phone: '054-1111111',
        email: null,
        address: null,
        notes: null,
        preferences: null,
        birthday: '2000-07-20',
        loyalty_enabled: true,
        loyalty_tier: 'bronze',
        store_id: STORE_ID,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };
      mockQuery.mockResolvedValue({ rows: [returnedRow] });

      await PgCustomerRepository.update(1, STORE_ID, {
        birthday: '1985-07-20',
      });

      const params = mockQuery.mock.calls[0][1];
      // The first param should be the normalized birthday value
      expect(params[0]).toBe('2000-07-20');
    });

    it('should set birthday to null when updating with null', async () => {
      const returnedRow = {
        id: 1,
        name: 'Bob',
        phone: '054-2222222',
        email: null,
        address: null,
        notes: null,
        preferences: null,
        birthday: null,
        loyalty_enabled: true,
        loyalty_tier: 'bronze',
        store_id: STORE_ID,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };
      mockQuery.mockResolvedValue({ rows: [returnedRow] });

      await PgCustomerRepository.update(1, STORE_ID, {
        birthday: null,
      });

      const params = mockQuery.mock.calls[0][1];
      expect(params[0]).toBeNull();
    });

    it('should not include birthday in update when not provided', async () => {
      const returnedRow = {
        id: 1,
        name: 'Updated Name',
        phone: '054-3333333',
        email: null,
        address: null,
        notes: null,
        preferences: null,
        birthday: '2000-05-10',
        loyalty_enabled: true,
        loyalty_tier: 'bronze',
        store_id: STORE_ID,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };
      mockQuery.mockResolvedValue({ rows: [returnedRow] });

      await PgCustomerRepository.update(1, STORE_ID, {
        name: 'Updated Name',
      });

      // The query should only include name, not birthday
      const query = mockQuery.mock.calls[0][0];
      expect(query).not.toContain('birthday');
    });
  });

  describe('mapRow - birthday mapping', () => {
    it('should map birthday from Date object to YYYY-MM-DD string', async () => {
      const returnedRow = {
        id: 1,
        name: 'Alice',
        phone: '054-1111111',
        email: null,
        address: null,
        notes: null,
        preferences: null,
        birthday: new Date('2000-03-15T00:00:00Z'),
        loyalty_enabled: true,
        loyalty_tier: 'bronze',
        store_id: STORE_ID,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };
      mockQuery.mockResolvedValue({ rows: [returnedRow] });

      const result = await PgCustomerRepository.findById(1, STORE_ID);

      expect(result).not.toBeNull();
      expect(result!.birthday).toBe('2000-03-15');
    });

    it('should map birthday from string to YYYY-MM-DD substring', async () => {
      const returnedRow = {
        id: 1,
        name: 'Bob',
        phone: '054-2222222',
        email: null,
        address: null,
        notes: null,
        preferences: null,
        birthday: '2000-06-20T00:00:00.000Z',
        loyalty_enabled: true,
        loyalty_tier: 'bronze',
        store_id: STORE_ID,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };
      mockQuery.mockResolvedValue({ rows: [returnedRow] });

      const result = await PgCustomerRepository.findById(1, STORE_ID);

      expect(result).not.toBeNull();
      expect(result!.birthday).toBe('2000-06-20');
    });

    it('should map null birthday to null', async () => {
      const returnedRow = {
        id: 1,
        name: 'Carol',
        phone: '054-3333333',
        email: null,
        address: null,
        notes: null,
        preferences: null,
        birthday: null,
        loyalty_enabled: true,
        loyalty_tier: 'bronze',
        store_id: STORE_ID,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };
      mockQuery.mockResolvedValue({ rows: [returnedRow] });

      const result = await PgCustomerRepository.findById(1, STORE_ID);

      expect(result).not.toBeNull();
      expect(result!.birthday).toBeNull();
    });

    it('should include segment field when present in row', async () => {
      const returnedRow = {
        id: 1,
        name: 'Dave',
        phone: '054-4444444',
        email: null,
        address: null,
        notes: null,
        preferences: null,
        birthday: null,
        loyalty_enabled: true,
        loyalty_tier: 'bronze',
        segment: 'vip',
        order_count: 15,
        total_spent: 5000,
        store_id: STORE_ID,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };
      mockQuery.mockResolvedValue({ rows: [returnedRow] });

      const result = await PgCustomerRepository.findById(1, STORE_ID);

      expect(result).not.toBeNull();
      expect(result!.segment).toBe('vip');
      expect(result!.orderCount).toBe(15);
      expect(result!.totalSpent).toBe(5000);
    });
  });
});
