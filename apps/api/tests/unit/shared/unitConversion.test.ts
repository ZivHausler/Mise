import { describe, it, expect } from 'vitest';
import { unitConversionFactor } from '../../../src/modules/shared/unitConversion.js';

describe('unitConversionFactor', () => {
  it('should return 1 for same unit', () => {
    expect(unitConversionFactor('kg', 'kg')).toBe(1);
    expect(unitConversionFactor('g', 'g')).toBe(1);
    expect(unitConversionFactor('ml', 'ml')).toBe(1);
  });

  it('should convert g to kg', () => {
    expect(unitConversionFactor('g', 'kg')).toBe(0.001);
  });

  it('should convert kg to g', () => {
    expect(unitConversionFactor('kg', 'g')).toBe(1000);
  });

  it('should convert ml to l', () => {
    expect(unitConversionFactor('ml', 'l')).toBe(0.001);
  });

  it('should convert l to ml', () => {
    expect(unitConversionFactor('l', 'ml')).toBe(1000);
  });

  it('should convert ml to liters', () => {
    expect(unitConversionFactor('ml', 'liters')).toBe(0.001);
  });

  it('should convert liters to ml', () => {
    expect(unitConversionFactor('liters', 'ml')).toBe(1000);
  });

  it('should convert pcs to units', () => {
    expect(unitConversionFactor('pcs', 'units')).toBe(1);
  });

  it('should convert units to pcs', () => {
    expect(unitConversionFactor('units', 'pcs')).toBe(1);
  });

  it('should return 1 for unknown conversions', () => {
    expect(unitConversionFactor('kg', 'ml')).toBe(1);
    expect(unitConversionFactor('cups', 'tbsp')).toBe(1);
    expect(unitConversionFactor('unknown', 'other')).toBe(1);
  });

  it('should handle practical calculations correctly', () => {
    // 500g in kg
    const factor = unitConversionFactor('g', 'kg');
    expect(500 * factor).toBe(0.5);

    // 2.5 liters in ml
    const factor2 = unitConversionFactor('l', 'ml');
    expect(2.5 * factor2).toBe(2500);
  });
});
