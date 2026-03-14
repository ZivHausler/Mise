import { describe, it, expect } from 'vitest';
import {
  STORE_CATEGORIES,
  STORE_CATEGORY_SUBJECT_KEYS,
  STORE_CATEGORY_MAP,
  ALL_SUB_SUBJECT_KEYS,
} from '@mise/shared';
import { updateBrandingSchema } from '../../../src/modules/stores/store.schema.js';

// ────────────────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────────────────

describe('Store Categories', () => {
  // ── Shared constants integrity ──────────────────────────────────────

  describe('shared constants integrity', () => {
    it('all subject keys should be unique', () => {
      const keys = STORE_CATEGORIES.map(c => c.key);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
    });

    it('all sub-subject keys should be globally unique (no duplicates across subjects)', () => {
      const allSubs: string[] = [];
      for (const cat of STORE_CATEGORIES) {
        for (const sub of cat.subSubjects) {
          expect(allSubs).not.toContain(sub);
          allSubs.push(sub);
        }
      }
    });

    it('STORE_CATEGORY_MAP should have the same number of entries as STORE_CATEGORIES', () => {
      expect(Object.keys(STORE_CATEGORY_MAP).length).toBe(STORE_CATEGORIES.length);
    });

    it('every sub-subject in STORE_CATEGORY_MAP should match STORE_CATEGORIES', () => {
      for (const cat of STORE_CATEGORIES) {
        const mapSubs = STORE_CATEGORY_MAP[cat.key];
        expect(mapSubs).toBeDefined();
        expect([...mapSubs!]).toEqual(cat.subSubjects);
      }
    });

    it('STORE_CATEGORY_SUBJECT_KEYS should list all subject keys in order', () => {
      expect(STORE_CATEGORY_SUBJECT_KEYS).toEqual(STORE_CATEGORIES.map(c => c.key));
    });

    it('ALL_SUB_SUBJECT_KEYS should contain every sub-subject', () => {
      const expected = STORE_CATEGORIES.flatMap(c => c.subSubjects);
      expect(ALL_SUB_SUBJECT_KEYS.size).toBe(expected.length);
      for (const sub of expected) {
        expect(ALL_SUB_SUBJECT_KEYS.has(sub)).toBe(true);
      }
    });
  });

  // ── Zod schema validation: category fields ─────────────────────────

  describe('updateBrandingSchema — category validation', () => {
    it('valid subject + valid sub-subject pair → passes', () => {
      const result = updateBrandingSchema.safeParse({
        categorySubject: 'food_bakery',
        categorySubSubject: 'bakery',
      });
      expect(result.success).toBe(true);
    });

    it('valid subject + null sub-subject → passes', () => {
      const result = updateBrandingSchema.safeParse({
        categorySubject: 'food_bakery',
        categorySubSubject: null,
      });
      expect(result.success).toBe(true);
    });

    it('null subject + null sub-subject → passes (clearing both)', () => {
      const result = updateBrandingSchema.safeParse({
        categorySubject: null,
        categorySubSubject: null,
      });
      expect(result.success).toBe(true);
    });

    it('invalid subject string → fails', () => {
      const result = updateBrandingSchema.safeParse({
        categorySubject: 'nonexistent_category',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map(i => i.message);
        expect(messages).toContain('INVALID_CATEGORY_SUBJECT');
      }
    });

    it('valid subject + invalid sub-subject → fails', () => {
      const result = updateBrandingSchema.safeParse({
        categorySubject: 'food_bakery',
        categorySubSubject: 'totally_invalid',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map(i => i.message);
        expect(messages).toContain('INVALID_CATEGORY_SUB_SUBJECT');
      }
    });

    it('valid subject + sub-subject from different subject → fails', () => {
      // 'coffee_shop' belongs to 'cafe_coffee', not 'food_bakery'
      const result = updateBrandingSchema.safeParse({
        categorySubject: 'food_bakery',
        categorySubSubject: 'coffee_shop',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map(i => i.message);
        expect(messages).toContain('INVALID_CATEGORY_SUB_SUBJECT');
      }
    });

    it('null subject + non-null sub-subject → fails (orphan)', () => {
      const result = updateBrandingSchema.safeParse({
        categorySubject: null,
        categorySubSubject: 'bakery',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map(i => i.message);
        // Should fail on either orphan check or sub-subject validation
        expect(
          messages.includes('CATEGORY_SUB_SUBJECT_REQUIRES_SUBJECT') ||
          messages.includes('INVALID_CATEGORY_SUB_SUBJECT'),
        ).toBe(true);
      }
    });

    it('sub-subject without subject (subject omitted) → fails', () => {
      const result = updateBrandingSchema.safeParse({
        categorySubSubject: 'bakery',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map(i => i.message);
        expect(messages).toContain('INVALID_CATEGORY_SUB_SUBJECT');
      }
    });

    it('category fields only (no logo/banner/description) → passes at-least-one-field check', () => {
      const result = updateBrandingSchema.safeParse({
        categorySubject: 'cafe_coffee',
      });
      expect(result.success).toBe(true);
    });

    it('empty object → fails at-least-one-field check', () => {
      const result = updateBrandingSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('valid subject with sub-subject omitted (undefined) → passes', () => {
      const result = updateBrandingSchema.safeParse({
        categorySubject: 'restaurant',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.categorySubject).toBe('restaurant');
        expect(result.data.categorySubSubject).toBeUndefined();
      }
    });

    it('category fields alongside branding fields → passes', () => {
      const result = updateBrandingSchema.safeParse({
        logoUrl: 'https://example.com/logo.jpg',
        categorySubject: 'food_bakery',
        categorySubSubject: 'pastry_shop',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.logoUrl).toBe('https://example.com/logo.jpg');
        expect(result.data.categorySubject).toBe('food_bakery');
        expect(result.data.categorySubSubject).toBe('pastry_shop');
      }
    });

    it('every subject/sub-subject pair from STORE_CATEGORIES is accepted', () => {
      for (const cat of STORE_CATEGORIES) {
        for (const sub of cat.subSubjects) {
          const result = updateBrandingSchema.safeParse({
            categorySubject: cat.key,
            categorySubSubject: sub,
          });
          expect(result.success, `Expected ${cat.key}/${sub} to pass`).toBe(true);
        }
      }
    });
  });
});
