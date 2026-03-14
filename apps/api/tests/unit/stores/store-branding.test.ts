import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────

vi.mock('../../../src/core/database/postgres.js', () => ({
  getPool: vi.fn().mockReturnValue({
    query: vi.fn(),
  }),
}));

vi.mock('../../../src/core/storage/gcs.js', () => ({
  deleteImage: vi.fn().mockResolvedValue(undefined),
  generateBrandingUploadUrl: vi.fn().mockResolvedValue({
    uploadUrl: 'https://storage.googleapis.com/signed-url',
    publicUrl: 'https://storage.googleapis.com/bucket/1/branding/logo/test.jpg',
  }),
  isManagedUrl: vi.fn().mockReturnValue(true),
  validateStoreOwnership: vi.fn().mockReturnValue(true),
}));

vi.mock('../../../src/core/logger/logger.js', () => ({
  appLogger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../../src/config/env.js', () => ({
  env: {
    JWT_EXPIRES_IN: '1h',
    FRONTEND_URL: 'https://app.mise.com',
    GCS_BUCKET_NAME: '',
  },
}));

import { PgStoreRepository } from '../../../src/modules/stores/store.repository.js';
import { StoreService } from '../../../src/modules/stores/store.service.js';
import { getPool } from '../../../src/core/database/postgres.js';
import { deleteImage } from '../../../src/core/storage/gcs.js';
import { brandingUploadUrlSchema, updateBrandingSchema } from '../../../src/modules/stores/store.schema.js';

// ── Helpers ────────────────────────────────────────────────────────────

function makeStoreRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 1,
    name: 'Test Bakery',
    code: null,
    address: null,
    phone: null,
    email: null,
    tax_number: null,
    vat_rate: 18,
    theme: 'cream',
    logo_url: null,
    banner_url: null,
    description: null,
    slug: 'test-bakery-1',
    storefront_enabled: false,
    auto_generate_invoice: false,
    auto_generate_credit_note: false,
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    ...overrides,
  };
}

// ────────────────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────────────────

describe('Store Branding', () => {
  let mockQuery: ReturnType<typeof vi.fn>;
  let service: StoreService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery = vi.mocked(getPool)().query as ReturnType<typeof vi.fn>;
    // StoreService takes a FastifyInstance; we only need it for JWT signing which we won't test here
    service = new StoreService(null as never);
  });

  // ── Service: updateBranding ────────────────────────────────────────

  describe('updateBranding (service)', () => {
    it('should update logo URL only', async () => {
      const currentRow = makeStoreRow();
      const updatedRow = makeStoreRow({ logo_url: '/uploads/1/branding/logo/new.jpg' });

      // findStoreById
      mockQuery.mockResolvedValueOnce({ rows: [currentRow] });
      // updateBranding
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await service.updateBranding(1, { logoUrl: '/uploads/1/branding/logo/new.jpg' });

      expect(result.logoUrl).toBe('/uploads/1/branding/logo/new.jpg');
      expect(deleteImage).not.toHaveBeenCalled();
    });

    it('should update banner URL only', async () => {
      const currentRow = makeStoreRow();
      const updatedRow = makeStoreRow({ banner_url: '/uploads/1/branding/banner/new.jpg' });

      mockQuery.mockResolvedValueOnce({ rows: [currentRow] });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await service.updateBranding(1, { bannerUrl: '/uploads/1/branding/banner/new.jpg' });

      expect(result.bannerUrl).toBe('/uploads/1/branding/banner/new.jpg');
      expect(deleteImage).not.toHaveBeenCalled();
    });

    it('should update description only', async () => {
      const currentRow = makeStoreRow();
      const updatedRow = makeStoreRow({ description: 'Best bakery in town' });

      mockQuery.mockResolvedValueOnce({ rows: [currentRow] });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await service.updateBranding(1, { description: 'Best bakery in town' });

      expect(result.description).toBe('Best bakery in town');
      expect(deleteImage).not.toHaveBeenCalled();
    });

    it('should update all three fields at once', async () => {
      const currentRow = makeStoreRow();
      const updatedRow = makeStoreRow({
        logo_url: '/uploads/1/branding/logo/new.jpg',
        banner_url: '/uploads/1/branding/banner/new.jpg',
        description: 'Our bakery',
      });

      mockQuery.mockResolvedValueOnce({ rows: [currentRow] });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await service.updateBranding(1, {
        logoUrl: '/uploads/1/branding/logo/new.jpg',
        bannerUrl: '/uploads/1/branding/banner/new.jpg',
        description: 'Our bakery',
      });

      expect(result.logoUrl).toBe('/uploads/1/branding/logo/new.jpg');
      expect(result.bannerUrl).toBe('/uploads/1/branding/banner/new.jpg');
      expect(result.description).toBe('Our bakery');
    });

    it('should clear a field by setting to null', async () => {
      const currentRow = makeStoreRow({ logo_url: '/uploads/1/branding/logo/old.jpg' });
      const updatedRow = makeStoreRow({ logo_url: null });

      mockQuery.mockResolvedValueOnce({ rows: [currentRow] });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await service.updateBranding(1, { logoUrl: null });

      expect(result.logoUrl).toBeNull();
      // Setting to null counts as replacing the old value, so delete should be called
      expect(deleteImage).toHaveBeenCalledWith('/uploads/1/branding/logo/old.jpg');
    });

    it('should delete old logo when replacing with new one', async () => {
      const oldLogoUrl = '/uploads/1/branding/logo/old.jpg';
      const newLogoUrl = '/uploads/1/branding/logo/new.jpg';
      const currentRow = makeStoreRow({ logo_url: oldLogoUrl });
      const updatedRow = makeStoreRow({ logo_url: newLogoUrl });

      mockQuery.mockResolvedValueOnce({ rows: [currentRow] });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      await service.updateBranding(1, { logoUrl: newLogoUrl });

      expect(deleteImage).toHaveBeenCalledWith(oldLogoUrl);
    });

    it('should delete old banner when replacing with new one', async () => {
      const oldBannerUrl = '/uploads/1/branding/banner/old.jpg';
      const newBannerUrl = '/uploads/1/branding/banner/new.jpg';
      const currentRow = makeStoreRow({ banner_url: oldBannerUrl });
      const updatedRow = makeStoreRow({ banner_url: newBannerUrl });

      mockQuery.mockResolvedValueOnce({ rows: [currentRow] });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      await service.updateBranding(1, { bannerUrl: newBannerUrl });

      expect(deleteImage).toHaveBeenCalledWith(oldBannerUrl);
    });

    it('should NOT delete old image when same URL is saved', async () => {
      const sameUrl = '/uploads/1/branding/logo/same.jpg';
      const currentRow = makeStoreRow({ logo_url: sameUrl });
      const updatedRow = makeStoreRow({ logo_url: sameUrl });

      mockQuery.mockResolvedValueOnce({ rows: [currentRow] });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      await service.updateBranding(1, { logoUrl: sameUrl });

      expect(deleteImage).not.toHaveBeenCalled();
    });

    it('should NOT delete old image when field is not provided', async () => {
      const currentRow = makeStoreRow({ logo_url: '/uploads/1/branding/logo/existing.jpg' });
      const updatedRow = makeStoreRow({
        logo_url: '/uploads/1/branding/logo/existing.jpg',
        description: 'Updated desc',
      });

      mockQuery.mockResolvedValueOnce({ rows: [currentRow] });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      // Only updating description, NOT providing logoUrl
      await service.updateBranding(1, { description: 'Updated desc' });

      expect(deleteImage).not.toHaveBeenCalled();
    });

    it('should not fail when deleteImage rejects (fire-and-forget)', async () => {
      const oldLogoUrl = '/uploads/1/branding/logo/old.jpg';
      const newLogoUrl = '/uploads/1/branding/logo/new.jpg';
      const currentRow = makeStoreRow({ logo_url: oldLogoUrl });
      const updatedRow = makeStoreRow({ logo_url: newLogoUrl });

      vi.mocked(deleteImage).mockRejectedValueOnce(new Error('GCS down'));

      mockQuery.mockResolvedValueOnce({ rows: [currentRow] });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      // Should not throw even though deleteImage rejects
      const result = await service.updateBranding(1, { logoUrl: newLogoUrl });
      expect(result.logoUrl).toBe(newLogoUrl);
    });
  });

  // ── Repository: updateBranding ─────────────────────────────────────

  describe('updateBranding (repository)', () => {
    it('should build UPDATE query with only provided fields', async () => {
      const updatedRow = makeStoreRow({ logo_url: '/uploads/1/branding/logo/new.jpg' });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      await PgStoreRepository.updateBranding(1, { logoUrl: '/uploads/1/branding/logo/new.jpg' });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('logo_url = $1'),
        ['/uploads/1/branding/logo/new.jpg', 1],
      );
    });

    it('should include all three fields when all provided', async () => {
      const updatedRow = makeStoreRow({
        logo_url: '/uploads/1/branding/logo/l.jpg',
        banner_url: '/uploads/1/branding/banner/b.jpg',
        description: 'Desc',
      });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      await PgStoreRepository.updateBranding(1, {
        logoUrl: '/uploads/1/branding/logo/l.jpg',
        bannerUrl: '/uploads/1/branding/banner/b.jpg',
        description: 'Desc',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('logo_url = $1'),
        expect.arrayContaining(['/uploads/1/branding/logo/l.jpg', '/uploads/1/branding/banner/b.jpg', 'Desc', 1]),
      );
    });

    it('should fall back to findStoreById when no fields provided', async () => {
      const existingRow = makeStoreRow();
      mockQuery.mockResolvedValueOnce({ rows: [existingRow] });

      const result = await PgStoreRepository.updateBranding(1, {});

      expect(result.id).toBe(1);
      // Should query SELECT, not UPDATE
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM stores WHERE id = $1',
        [1],
      );
    });
  });

  // ── Repository: mapStoreRow includes branding fields ───────────────

  describe('mapStoreRow branding fields', () => {
    it('should map logo_url, banner_url, description from DB row', async () => {
      const row = makeStoreRow({
        logo_url: '/uploads/1/branding/logo/logo.png',
        banner_url: '/uploads/1/branding/banner/banner.webp',
        description: 'A bakery',
      });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const store = await PgStoreRepository.findStoreById(1);

      expect(store!.logoUrl).toBe('/uploads/1/branding/logo/logo.png');
      expect(store!.bannerUrl).toBe('/uploads/1/branding/banner/banner.webp');
      expect(store!.description).toBe('A bakery');
    });

    it('should map null branding fields correctly', async () => {
      const row = makeStoreRow({ logo_url: null, banner_url: null, description: null });
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const store = await PgStoreRepository.findStoreById(1);

      expect(store!.logoUrl).toBeNull();
      expect(store!.bannerUrl).toBeNull();
      expect(store!.description).toBeNull();
    });
  });

  // ── Schema validation ─────────────────────────────────────────────

  describe('updateBrandingSchema', () => {
    it('should accept valid branding update with all fields', () => {
      const result = updateBrandingSchema.safeParse({
        logoUrl: 'https://example.com/logo.jpg',
        bannerUrl: 'https://example.com/banner.jpg',
        description: 'Our bakery makes the best bread',
      });
      expect(result.success).toBe(true);
    });

    it('should accept update with only logoUrl', () => {
      const result = updateBrandingSchema.safeParse({ logoUrl: 'https://example.com/logo.jpg' });
      expect(result.success).toBe(true);
    });

    it('should accept update with only bannerUrl', () => {
      const result = updateBrandingSchema.safeParse({ bannerUrl: 'https://example.com/banner.jpg' });
      expect(result.success).toBe(true);
    });

    it('should accept update with only description', () => {
      const result = updateBrandingSchema.safeParse({ description: 'Just a description' });
      expect(result.success).toBe(true);
    });

    it('should accept null values to clear fields', () => {
      const result = updateBrandingSchema.safeParse({ logoUrl: null, bannerUrl: null, description: null });
      expect(result.success).toBe(true);
    });

    it('should reject empty body {}', () => {
      const result = updateBrandingSchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('AT_LEAST_ONE_FIELD_REQUIRED');
      }
    });

    it('should reject description over 500 chars', () => {
      const longDescription = 'a'.repeat(501);
      const result = updateBrandingSchema.safeParse({ description: longDescription });
      expect(result.success).toBe(false);
    });

    it('should accept description of exactly 500 chars', () => {
      const exactDescription = 'a'.repeat(500);
      const result = updateBrandingSchema.safeParse({ description: exactDescription });
      expect(result.success).toBe(true);
    });

    it('should strip HTML tags from description', () => {
      const result = updateBrandingSchema.safeParse({ description: '<b>Bold</b> and <i>italic</i> text' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBe('Bold and italic text');
      }
    });

    it('should strip nested/complex HTML tags', () => {
      const result = updateBrandingSchema.safeParse({
        description: '<div class="bad"><script>alert("xss")</script>Safe text</div>',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBe('alert("xss")Safe text');
      }
    });

    it('should trim whitespace from description', () => {
      const result = updateBrandingSchema.safeParse({ description: '  hello  ' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBe('hello');
      }
    });

    it('should pass null description through without stripping', () => {
      const result = updateBrandingSchema.safeParse({ description: null });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBeNull();
      }
    });

    it('should reject logoUrl over 2000 chars', () => {
      const result = updateBrandingSchema.safeParse({ logoUrl: 'https://' + 'a'.repeat(2000) });
      expect(result.success).toBe(false);
    });
  });

  describe('brandingUploadUrlSchema', () => {
    it('should accept valid logo upload request', () => {
      const result = brandingUploadUrlSchema.safeParse({ type: 'logo', mimeType: 'image/jpeg' });
      expect(result.success).toBe(true);
    });

    it('should accept valid banner upload request', () => {
      const result = brandingUploadUrlSchema.safeParse({ type: 'banner', mimeType: 'image/png' });
      expect(result.success).toBe(true);
    });

    it('should accept image/webp mimeType', () => {
      const result = brandingUploadUrlSchema.safeParse({ type: 'logo', mimeType: 'image/webp' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid type', () => {
      const result = brandingUploadUrlSchema.safeParse({ type: 'avatar', mimeType: 'image/jpeg' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid mimeType', () => {
      const result = brandingUploadUrlSchema.safeParse({ type: 'logo', mimeType: 'image/gif' });
      expect(result.success).toBe(false);
    });

    it('should reject missing type', () => {
      const result = brandingUploadUrlSchema.safeParse({ mimeType: 'image/jpeg' });
      expect(result.success).toBe(false);
    });

    it('should reject missing mimeType', () => {
      const result = brandingUploadUrlSchema.safeParse({ type: 'logo' });
      expect(result.success).toBe(false);
    });
  });
});
