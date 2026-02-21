import { describe, it, expect } from 'vitest';
import { adjustLoyaltySchema, redeemLoyaltySchema, updateLoyaltyConfigSchema } from '../../../src/modules/loyalty/loyalty.schema.js';

const VALID_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

describe('adjustLoyaltySchema', () => {
  it('should accept valid positive adjustment', () => {
    const result = adjustLoyaltySchema.parse({ customerId: VALID_UUID, points: 50 });
    expect(result.customerId).toBe(VALID_UUID);
    expect(result.points).toBe(50);
    expect(result.description).toBeUndefined();
  });

  it('should accept valid negative adjustment', () => {
    const result = adjustLoyaltySchema.parse({ customerId: VALID_UUID, points: -30 });
    expect(result.points).toBe(-30);
  });

  it('should accept optional description', () => {
    const result = adjustLoyaltySchema.parse({ customerId: VALID_UUID, points: 10, description: 'bonus points' });
    expect(result.description).toBe('bonus points');
  });

  it('should reject zero points', () => {
    expect(() => adjustLoyaltySchema.parse({ customerId: VALID_UUID, points: 0 })).toThrow();
  });

  it('should reject non-integer points', () => {
    expect(() => adjustLoyaltySchema.parse({ customerId: VALID_UUID, points: 3.5 })).toThrow();
  });

  it('should reject invalid UUID', () => {
    expect(() => adjustLoyaltySchema.parse({ customerId: 'not-uuid', points: 10 })).toThrow();
  });

  it('should reject description longer than 500 characters', () => {
    expect(() =>
      adjustLoyaltySchema.parse({ customerId: VALID_UUID, points: 10, description: 'x'.repeat(501) }),
    ).toThrow();
  });

  it('should accept description of exactly 500 characters', () => {
    const result = adjustLoyaltySchema.parse({ customerId: VALID_UUID, points: 10, description: 'x'.repeat(500) });
    expect(result.description).toHaveLength(500);
  });

  it('should reject missing customerId', () => {
    expect(() => adjustLoyaltySchema.parse({ points: 10 })).toThrow();
  });

  it('should reject missing points', () => {
    expect(() => adjustLoyaltySchema.parse({ customerId: VALID_UUID })).toThrow();
  });
});

describe('redeemLoyaltySchema', () => {
  it('should accept valid redemption', () => {
    const result = redeemLoyaltySchema.parse({ customerId: VALID_UUID, points: 100 });
    expect(result.customerId).toBe(VALID_UUID);
    expect(result.points).toBe(100);
  });

  it('should reject zero points', () => {
    expect(() => redeemLoyaltySchema.parse({ customerId: VALID_UUID, points: 0 })).toThrow();
  });

  it('should reject negative points', () => {
    expect(() => redeemLoyaltySchema.parse({ customerId: VALID_UUID, points: -10 })).toThrow();
  });

  it('should reject non-integer points', () => {
    expect(() => redeemLoyaltySchema.parse({ customerId: VALID_UUID, points: 5.5 })).toThrow();
  });

  it('should reject invalid UUID', () => {
    expect(() => redeemLoyaltySchema.parse({ customerId: 'bad', points: 10 })).toThrow();
  });

  it('should accept large point values', () => {
    const result = redeemLoyaltySchema.parse({ customerId: VALID_UUID, points: 999999 });
    expect(result.points).toBe(999999);
  });
});

describe('updateLoyaltyConfigSchema', () => {
  it('should accept empty object (all fields optional)', () => {
    const result = updateLoyaltyConfigSchema.parse({});
    expect(result).toEqual({});
  });

  it('should accept valid full config', () => {
    const result = updateLoyaltyConfigSchema.parse({
      isActive: true,
      pointsPerShekel: 2,
      pointValue: 0.5,
      minRedeemPoints: 50,
    });
    expect(result).toEqual({ isActive: true, pointsPerShekel: 2, pointValue: 0.5, minRedeemPoints: 50 });
  });

  it('should accept partial config (only isActive)', () => {
    const result = updateLoyaltyConfigSchema.parse({ isActive: false });
    expect(result).toEqual({ isActive: false });
  });

  it('should reject negative pointsPerShekel', () => {
    expect(() => updateLoyaltyConfigSchema.parse({ pointsPerShekel: -1 })).toThrow();
  });

  it('should reject zero pointsPerShekel', () => {
    expect(() => updateLoyaltyConfigSchema.parse({ pointsPerShekel: 0 })).toThrow();
  });

  it('should reject pointsPerShekel above 1000', () => {
    expect(() => updateLoyaltyConfigSchema.parse({ pointsPerShekel: 1001 })).toThrow();
  });

  it('should accept pointsPerShekel at boundary (1000)', () => {
    const result = updateLoyaltyConfigSchema.parse({ pointsPerShekel: 1000 });
    expect(result.pointsPerShekel).toBe(1000);
  });

  it('should reject negative pointValue', () => {
    expect(() => updateLoyaltyConfigSchema.parse({ pointValue: -0.1 })).toThrow();
  });

  it('should reject zero pointValue', () => {
    expect(() => updateLoyaltyConfigSchema.parse({ pointValue: 0 })).toThrow();
  });

  it('should reject pointValue above 1000', () => {
    expect(() => updateLoyaltyConfigSchema.parse({ pointValue: 1001 })).toThrow();
  });

  it('should reject negative minRedeemPoints', () => {
    expect(() => updateLoyaltyConfigSchema.parse({ minRedeemPoints: -1 })).toThrow();
  });

  it('should accept zero minRedeemPoints', () => {
    const result = updateLoyaltyConfigSchema.parse({ minRedeemPoints: 0 });
    expect(result.minRedeemPoints).toBe(0);
  });

  it('should reject non-integer minRedeemPoints', () => {
    expect(() => updateLoyaltyConfigSchema.parse({ minRedeemPoints: 5.5 })).toThrow();
  });

  it('should reject non-boolean isActive', () => {
    expect(() => updateLoyaltyConfigSchema.parse({ isActive: 'yes' })).toThrow();
  });

  it('should strip unknown fields', () => {
    const result = updateLoyaltyConfigSchema.parse({ isActive: true, unknownField: 'test' });
    expect(result).toEqual({ isActive: true });
  });
});
