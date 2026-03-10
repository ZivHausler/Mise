import { describe, it, expect } from 'vitest';
import { clampAnchorDay, getNextBillingDate } from '../../../src/modules/subscription/subscription.service.js';

describe('clampAnchorDay', () => {
  it('should return anchor day 15 unchanged for any standard month', () => {
    // March (month index 2) has 31 days
    expect(clampAnchorDay(15, 2026, 2)).toBe(15);
    // February (month index 1) has 28 days in 2026
    expect(clampAnchorDay(15, 2026, 1)).toBe(15);
  });

  it('should clamp anchor day 31 to 28 in February (non-leap year)', () => {
    // Feb 2026 has 28 days
    expect(clampAnchorDay(31, 2026, 1)).toBe(28);
  });

  it('should clamp anchor day 31 to 29 in February (leap year)', () => {
    // Feb 2028 is a leap year
    expect(clampAnchorDay(31, 2028, 1)).toBe(29);
  });

  it('should clamp anchor day 31 to 30 in April', () => {
    // April (month index 3) has 30 days
    expect(clampAnchorDay(31, 2026, 3)).toBe(30);
  });

  it('should keep anchor day 31 in January', () => {
    // January (month index 0) has 31 days
    expect(clampAnchorDay(31, 2026, 0)).toBe(31);
  });

  it('should clamp anchor day 29 to 28 in February non-leap year', () => {
    expect(clampAnchorDay(29, 2026, 1)).toBe(28);
  });

  it('should keep anchor day 29 in February leap year', () => {
    expect(clampAnchorDay(29, 2028, 1)).toBe(29);
  });

  it('should clamp anchor day 30 to 28 in February non-leap year', () => {
    expect(clampAnchorDay(30, 2026, 1)).toBe(28);
  });
});

describe('getNextBillingDate', () => {
  it('should return this month when today is before anchor day', () => {
    const fromDate = new Date(2026, 2, 10); // March 10
    const result = getNextBillingDate(15, fromDate);

    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(2); // March
    expect(result.getDate()).toBe(15);
  });

  it('should return next month when today is after anchor day', () => {
    const fromDate = new Date(2026, 2, 20); // March 20
    const result = getNextBillingDate(15, fromDate);

    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(3); // April
    expect(result.getDate()).toBe(15);
  });

  it('should return next month when today equals anchor day', () => {
    const fromDate = new Date(2026, 2, 15); // March 15
    const result = getNextBillingDate(15, fromDate);

    // fromDate.getDate() (15) is NOT < clampedDay (15), so should go to next month
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(3); // April
    expect(result.getDate()).toBe(15);
  });

  it('should clamp anchor day 31 to 28 when next month is February', () => {
    const fromDate = new Date(2026, 0, 31); // January 31
    const result = getNextBillingDate(31, fromDate);

    // Jan 31 is not < 31, so next month is Feb
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(1); // February
    expect(result.getDate()).toBe(28); // clamped from 31
  });

  it('should clamp anchor day 31 to 29 in Feb leap year', () => {
    const fromDate = new Date(2028, 0, 31); // January 31, 2028 (leap year)
    const result = getNextBillingDate(31, fromDate);

    expect(result.getFullYear()).toBe(2028);
    expect(result.getMonth()).toBe(1); // February
    expect(result.getDate()).toBe(29);
  });

  it('should roll over from December to January next year', () => {
    const fromDate = new Date(2026, 11, 20); // December 20
    const result = getNextBillingDate(15, fromDate);

    expect(result.getFullYear()).toBe(2027);
    expect(result.getMonth()).toBe(0); // January
    expect(result.getDate()).toBe(15);
  });

  it('should return this month when anchor day 31 and from Jan 1', () => {
    const fromDate = new Date(2026, 0, 1); // January 1
    const result = getNextBillingDate(31, fromDate);

    // 1 < 31 so bill this month
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(0); // January
    expect(result.getDate()).toBe(31);
  });

  it('should handle anchor day 31 going from March into April (30 days)', () => {
    const fromDate = new Date(2026, 2, 31); // March 31
    const result = getNextBillingDate(31, fromDate);

    // 31 is not < 31, so next month (April) clamped to 30
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(3); // April
    expect(result.getDate()).toBe(30);
  });
});
