import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/core/database/postgres.js', () => ({
  getPool: vi.fn().mockReturnValue({
    query: vi.fn(),
  }),
}));

import { PgStoreRepository } from '../../../src/modules/stores/store.repository.js';
import { getPool } from '../../../src/core/database/postgres.js';

describe('Store slug operations', () => {
  let mockQuery: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery = vi.mocked(getPool)().query as ReturnType<typeof vi.fn>;
  });

  // ── Slug generation (tested via createStore) ──

  describe('createStore slug generation', () => {
    it('should generate slug from English store name', async () => {
      const storeRow = {
        id: 1,
        name: 'Sweet Bites',
        code: null,
        address: null,
        phone: null,
        email: null,
        tax_number: null,
        vat_rate: 18,
        theme: 'cream',
        slug: 'sweet-bites',
        storefront_enabled: false,
        auto_generate_invoice: false,
        auto_generate_credit_note: false,
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
      };

      // First query: INSERT
      mockQuery.mockResolvedValueOnce({ rows: [storeRow] });
      // Second query: UPDATE slug with ID suffix
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // Third query: invoice counters
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const store = await PgStoreRepository.createStore({ name: 'Sweet Bites' });

      // Should append the store ID
      expect(store.slug).toBe('sweet-bites-1');

      // Verify the INSERT used a temp slug
      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('INSERT INTO stores'),
        expect.arrayContaining(['Sweet Bites']),
      );

      // Verify the UPDATE set final slug
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        'UPDATE stores SET slug = $1 WHERE id = $2',
        ['sweet-bites-1', 1],
      );
    });

    it('should strip non-ASCII characters (Hebrew fallback to "store")', async () => {
      const storeRow = {
        id: 5,
        name: 'מאפייה',
        code: null,
        address: null,
        phone: null,
        email: null,
        tax_number: null,
        vat_rate: 18,
        theme: 'cream',
        slug: 'store',
        storefront_enabled: false,
        auto_generate_invoice: false,
        auto_generate_credit_note: false,
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
      };

      mockQuery.mockResolvedValueOnce({ rows: [storeRow] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const store = await PgStoreRepository.createStore({ name: 'מאפייה' });

      // Hebrew chars are stripped, fallback to 'store', then appended with ID
      expect(store.slug).toBe('store-5');
    });

    it('should collapse multiple spaces and hyphens', async () => {
      const storeRow = {
        id: 3,
        name: 'My   Great   Bakery',
        code: null,
        address: null,
        phone: null,
        email: null,
        tax_number: null,
        vat_rate: 18,
        theme: 'cream',
        slug: 'my-great-bakery',
        storefront_enabled: false,
        auto_generate_invoice: false,
        auto_generate_credit_note: false,
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
      };

      mockQuery.mockResolvedValueOnce({ rows: [storeRow] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const store = await PgStoreRepository.createStore({ name: 'My   Great   Bakery' });

      expect(store.slug).toBe('my-great-bakery-3');
    });
  });

  // ── findBySlug ──

  describe('findBySlug', () => {
    it('should return store when slug exists', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          name: 'Test',
          code: null,
          address: '123 St',
          phone: '054-1111111',
          email: null,
          tax_number: null,
          vat_rate: 18,
          theme: 'cream',
          slug: 'test-1',
          storefront_enabled: true,
          auto_generate_invoice: false,
          auto_generate_credit_note: false,
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
        }],
      });

      const store = await PgStoreRepository.findBySlug('test-1');

      expect(store).not.toBeNull();
      expect(store!.id).toBe(1);
      expect(store!.slug).toBe('test-1');
      expect(store!.storefrontEnabled).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM stores WHERE slug = $1', ['test-1']);
    });

    it('should return null when slug does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const store = await PgStoreRepository.findBySlug('nonexistent');

      expect(store).toBeNull();
    });
  });

  // ── isSlugAvailable ──

  describe('isSlugAvailable', () => {
    it('should return true when slug is not taken', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const available = await PgStoreRepository.isSlugAvailable('new-slug');

      expect(available).toBe(true);
    });

    it('should return false when slug is taken', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ 1: 1 }] });

      const available = await PgStoreRepository.isSlugAvailable('taken-slug');

      expect(available).toBe(false);
    });

    it('should exclude a specific store ID when checking availability', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await PgStoreRepository.isSlugAvailable('my-slug', 5);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT 1 FROM stores WHERE slug = $1 AND id != $2',
        ['my-slug', 5],
      );
    });
  });

  // ── updateSlug ──

  describe('updateSlug', () => {
    it('should update slug for a store', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await PgStoreRepository.updateSlug(1, 'new-custom-slug');

      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE stores SET slug = $1, updated_at = NOW() WHERE id = $2',
        ['new-custom-slug', 1],
      );
    });
  });

  // ── updateStorefrontEnabled ──

  describe('updateStorefrontEnabled', () => {
    it('should enable storefront', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await PgStoreRepository.updateStorefrontEnabled(1, true);

      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE stores SET storefront_enabled = $1, updated_at = NOW() WHERE id = $2',
        [true, 1],
      );
    });

    it('should disable storefront', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await PgStoreRepository.updateStorefrontEnabled(1, false);

      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE stores SET storefront_enabled = $1, updated_at = NOW() WHERE id = $2',
        [false, 1],
      );
    });
  });
});
