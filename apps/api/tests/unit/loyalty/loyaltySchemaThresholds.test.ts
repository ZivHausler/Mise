import { describe, it, expect } from 'vitest';
import { updateLoyaltyConfigSchema, segmentFilterSchema } from '../../../src/modules/loyalty/loyalty.schema.js';

describe('updateLoyaltyConfigSchema - segment threshold fields', () => {
  // ─── segmentVipOrderCount ──────────────────────────────────

  describe('segmentVipOrderCount', () => {
    it('should accept valid value', () => {
      const result = updateLoyaltyConfigSchema.parse({ segmentVipOrderCount: 10 });
      expect(result.segmentVipOrderCount).toBe(10);
    });

    it('should reject zero', () => {
      expect(() => updateLoyaltyConfigSchema.parse({ segmentVipOrderCount: 0 })).toThrow();
    });

    it('should reject negative', () => {
      expect(() => updateLoyaltyConfigSchema.parse({ segmentVipOrderCount: -1 })).toThrow();
    });

    it('should reject non-integer', () => {
      expect(() => updateLoyaltyConfigSchema.parse({ segmentVipOrderCount: 5.5 })).toThrow();
    });

    it('should accept max boundary (1000)', () => {
      const result = updateLoyaltyConfigSchema.parse({ segmentVipOrderCount: 1000 });
      expect(result.segmentVipOrderCount).toBe(1000);
    });

    it('should reject above max (1001)', () => {
      expect(() => updateLoyaltyConfigSchema.parse({ segmentVipOrderCount: 1001 })).toThrow();
    });

    it('should accept min boundary (1)', () => {
      const result = updateLoyaltyConfigSchema.parse({ segmentVipOrderCount: 1 });
      expect(result.segmentVipOrderCount).toBe(1);
    });
  });

  // ─── segmentVipDays ────────────────────────────────────────

  describe('segmentVipDays', () => {
    it('should accept valid value', () => {
      const result = updateLoyaltyConfigSchema.parse({ segmentVipDays: 90 });
      expect(result.segmentVipDays).toBe(90);
    });

    it('should reject zero', () => {
      expect(() => updateLoyaltyConfigSchema.parse({ segmentVipDays: 0 })).toThrow();
    });

    it('should reject negative', () => {
      expect(() => updateLoyaltyConfigSchema.parse({ segmentVipDays: -30 })).toThrow();
    });

    it('should accept max boundary (365)', () => {
      const result = updateLoyaltyConfigSchema.parse({ segmentVipDays: 365 });
      expect(result.segmentVipDays).toBe(365);
    });

    it('should reject above max (366)', () => {
      expect(() => updateLoyaltyConfigSchema.parse({ segmentVipDays: 366 })).toThrow();
    });

    it('should reject non-integer', () => {
      expect(() => updateLoyaltyConfigSchema.parse({ segmentVipDays: 30.5 })).toThrow();
    });
  });

  // ─── segmentRegularOrderCount ──────────────────────────────

  describe('segmentRegularOrderCount', () => {
    it('should accept valid value', () => {
      const result = updateLoyaltyConfigSchema.parse({ segmentRegularOrderCount: 3 });
      expect(result.segmentRegularOrderCount).toBe(3);
    });

    it('should reject zero', () => {
      expect(() => updateLoyaltyConfigSchema.parse({ segmentRegularOrderCount: 0 })).toThrow();
    });

    it('should reject negative', () => {
      expect(() => updateLoyaltyConfigSchema.parse({ segmentRegularOrderCount: -1 })).toThrow();
    });

    it('should accept max boundary (1000)', () => {
      const result = updateLoyaltyConfigSchema.parse({ segmentRegularOrderCount: 1000 });
      expect(result.segmentRegularOrderCount).toBe(1000);
    });

    it('should reject above max', () => {
      expect(() => updateLoyaltyConfigSchema.parse({ segmentRegularOrderCount: 1001 })).toThrow();
    });
  });

  // ─── segmentRegularDays ────────────────────────────────────

  describe('segmentRegularDays', () => {
    it('should accept valid value', () => {
      const result = updateLoyaltyConfigSchema.parse({ segmentRegularDays: 90 });
      expect(result.segmentRegularDays).toBe(90);
    });

    it('should reject zero', () => {
      expect(() => updateLoyaltyConfigSchema.parse({ segmentRegularDays: 0 })).toThrow();
    });

    it('should accept max boundary (365)', () => {
      const result = updateLoyaltyConfigSchema.parse({ segmentRegularDays: 365 });
      expect(result.segmentRegularDays).toBe(365);
    });

    it('should reject above max (366)', () => {
      expect(() => updateLoyaltyConfigSchema.parse({ segmentRegularDays: 366 })).toThrow();
    });
  });

  // ─── segmentNewDays ────────────────────────────────────────

  describe('segmentNewDays', () => {
    it('should accept valid value', () => {
      const result = updateLoyaltyConfigSchema.parse({ segmentNewDays: 30 });
      expect(result.segmentNewDays).toBe(30);
    });

    it('should reject zero', () => {
      expect(() => updateLoyaltyConfigSchema.parse({ segmentNewDays: 0 })).toThrow();
    });

    it('should reject negative', () => {
      expect(() => updateLoyaltyConfigSchema.parse({ segmentNewDays: -7 })).toThrow();
    });

    it('should accept max boundary (365)', () => {
      const result = updateLoyaltyConfigSchema.parse({ segmentNewDays: 365 });
      expect(result.segmentNewDays).toBe(365);
    });

    it('should reject above max', () => {
      expect(() => updateLoyaltyConfigSchema.parse({ segmentNewDays: 366 })).toThrow();
    });

    it('should accept min boundary (1)', () => {
      const result = updateLoyaltyConfigSchema.parse({ segmentNewDays: 1 });
      expect(result.segmentNewDays).toBe(1);
    });
  });

  // ─── segmentDormantDays ────────────────────────────────────

  describe('segmentDormantDays', () => {
    it('should accept valid value', () => {
      const result = updateLoyaltyConfigSchema.parse({ segmentDormantDays: 60 });
      expect(result.segmentDormantDays).toBe(60);
    });

    it('should reject zero', () => {
      expect(() => updateLoyaltyConfigSchema.parse({ segmentDormantDays: 0 })).toThrow();
    });

    it('should reject negative', () => {
      expect(() => updateLoyaltyConfigSchema.parse({ segmentDormantDays: -10 })).toThrow();
    });

    it('should accept max boundary (365)', () => {
      const result = updateLoyaltyConfigSchema.parse({ segmentDormantDays: 365 });
      expect(result.segmentDormantDays).toBe(365);
    });

    it('should reject above max', () => {
      expect(() => updateLoyaltyConfigSchema.parse({ segmentDormantDays: 366 })).toThrow();
    });
  });

  // ─── birthdayReminderDays ──────────────────────────────────

  describe('birthdayReminderDays', () => {
    it('should accept valid value', () => {
      const result = updateLoyaltyConfigSchema.parse({ birthdayReminderDays: 7 });
      expect(result.birthdayReminderDays).toBe(7);
    });

    it('should reject zero', () => {
      expect(() => updateLoyaltyConfigSchema.parse({ birthdayReminderDays: 0 })).toThrow();
    });

    it('should reject negative', () => {
      expect(() => updateLoyaltyConfigSchema.parse({ birthdayReminderDays: -1 })).toThrow();
    });

    it('should accept max boundary (90)', () => {
      const result = updateLoyaltyConfigSchema.parse({ birthdayReminderDays: 90 });
      expect(result.birthdayReminderDays).toBe(90);
    });

    it('should reject above max (91)', () => {
      expect(() => updateLoyaltyConfigSchema.parse({ birthdayReminderDays: 91 })).toThrow();
    });

    it('should accept min boundary (1)', () => {
      const result = updateLoyaltyConfigSchema.parse({ birthdayReminderDays: 1 });
      expect(result.birthdayReminderDays).toBe(1);
    });

    it('should reject non-integer', () => {
      expect(() => updateLoyaltyConfigSchema.parse({ birthdayReminderDays: 3.5 })).toThrow();
    });
  });

  // ─── Combined threshold + existing fields ──────────────────

  describe('combined updates', () => {
    it('should accept threshold fields alongside existing fields', () => {
      const result = updateLoyaltyConfigSchema.parse({
        isActive: true,
        pointsPerShekel: 2,
        segmentVipOrderCount: 15,
        segmentDormantDays: 45,
        birthdayReminderDays: 14,
      });
      expect(result).toEqual({
        isActive: true,
        pointsPerShekel: 2,
        segmentVipOrderCount: 15,
        segmentDormantDays: 45,
        birthdayReminderDays: 14,
      });
    });

    it('should accept partial threshold updates (only some thresholds)', () => {
      const result = updateLoyaltyConfigSchema.parse({
        segmentVipOrderCount: 20,
        segmentRegularDays: 60,
      });
      expect(result.segmentVipOrderCount).toBe(20);
      expect(result.segmentRegularDays).toBe(60);
      expect(result.segmentVipDays).toBeUndefined();
      expect(result.segmentNewDays).toBeUndefined();
    });

    it('should strip unknown fields while keeping valid threshold fields', () => {
      const result = updateLoyaltyConfigSchema.parse({
        segmentVipOrderCount: 10,
        segmentFakeDays: 999,
      });
      expect(result.segmentVipOrderCount).toBe(10);
      expect((result as any).segmentFakeDays).toBeUndefined();
    });

    it('should accept all threshold fields at once', () => {
      const result = updateLoyaltyConfigSchema.parse({
        segmentVipOrderCount: 15,
        segmentVipDays: 120,
        segmentRegularOrderCount: 5,
        segmentRegularDays: 60,
        segmentNewDays: 14,
        segmentDormantDays: 90,
        birthdayReminderDays: 30,
      });
      expect(result.segmentVipOrderCount).toBe(15);
      expect(result.segmentVipDays).toBe(120);
      expect(result.segmentRegularOrderCount).toBe(5);
      expect(result.segmentRegularDays).toBe(60);
      expect(result.segmentNewDays).toBe(14);
      expect(result.segmentDormantDays).toBe(90);
      expect(result.birthdayReminderDays).toBe(30);
    });
  });
});

// ─── segmentFilterSchema ──────────────────────────────────────

describe('segmentFilterSchema', () => {
  it('should accept "vip"', () => {
    expect(segmentFilterSchema.parse('vip')).toBe('vip');
  });

  it('should accept "regular"', () => {
    expect(segmentFilterSchema.parse('regular')).toBe('regular');
  });

  it('should accept "new"', () => {
    expect(segmentFilterSchema.parse('new')).toBe('new');
  });

  it('should accept "dormant"', () => {
    expect(segmentFilterSchema.parse('dormant')).toBe('dormant');
  });

  it('should accept "inactive"', () => {
    expect(segmentFilterSchema.parse('inactive')).toBe('inactive');
  });

  it('should accept undefined', () => {
    expect(segmentFilterSchema.parse(undefined)).toBeUndefined();
  });

  it('should reject invalid segment value', () => {
    expect(() => segmentFilterSchema.parse('platinum')).toThrow();
  });

  it('should reject empty string', () => {
    expect(() => segmentFilterSchema.parse('')).toThrow();
  });

  it('should reject numeric values', () => {
    expect(() => segmentFilterSchema.parse(1)).toThrow();
  });

  it('should reject uppercase variants', () => {
    expect(() => segmentFilterSchema.parse('VIP')).toThrow();
  });
});
