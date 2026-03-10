import { describe, it, expect } from 'vitest';
import { calculateProration } from '../../../src/modules/subscription/subscription.service.js';

describe('calculateProration', () => {
  it('should prorate Basic(49) -> Pro(99) with 15 days remaining of 30', () => {
    const periodStart = new Date('2026-03-01');
    const periodEnd = new Date('2026-03-31');
    const now = new Date('2026-03-16'); // 15 days remaining

    const result = calculateProration(49, 99, periodStart, periodEnd, now);

    // diff = (99 - 49) * 100 = 5000 agorot
    // proration = 5000 * (15 / 30) = 2500 agorot
    expect(result.amountAgorot).toBe(2500);
    expect(result.daysRemaining).toBe(15);
    expect(result.daysInPeriod).toBe(30);
  });

  it('should charge full price diff when full period remaining', () => {
    const periodStart = new Date('2026-03-01');
    const periodEnd = new Date('2026-03-31');
    const now = new Date('2026-03-01'); // full 30 days remaining

    const result = calculateProration(49, 99, periodStart, periodEnd, now);

    // diff = 5000 agorot, 30/30 = 5000
    expect(result.amountAgorot).toBe(5000);
    expect(result.daysRemaining).toBe(30);
    expect(result.daysInPeriod).toBe(30);
  });

  it('should produce minimal charge with 1 day remaining', () => {
    const periodStart = new Date('2026-03-01');
    const periodEnd = new Date('2026-03-31');
    const now = new Date('2026-03-30'); // 1 day remaining

    const result = calculateProration(49, 99, periodStart, periodEnd, now);

    // diff = 5000, 1/30 = 166.67 -> rounds to 167
    expect(result.amountAgorot).toBe(167);
    expect(result.daysRemaining).toBe(1);
    expect(result.daysInPeriod).toBe(30);
  });

  it('should return 0 charge for same price plans', () => {
    const periodStart = new Date('2026-03-01');
    const periodEnd = new Date('2026-03-31');
    const now = new Date('2026-03-15');

    const result = calculateProration(49, 49, periodStart, periodEnd, now);

    expect(result.amountAgorot).toBe(0);
  });

  it('should charge full new price for free to paid (0 -> 99)', () => {
    const periodStart = new Date('2026-03-01');
    const periodEnd = new Date('2026-03-31');
    const now = new Date('2026-03-01');

    const result = calculateProration(0, 99, periodStart, periodEnd, now);

    // diff = 9900 * (30/30) = 9900
    expect(result.amountAgorot).toBe(9900);
    expect(result.daysRemaining).toBe(30);
  });

  it('should handle 28-day February period', () => {
    const periodStart = new Date('2026-02-01');
    const periodEnd = new Date('2026-03-01'); // 28 days in Feb 2026

    const result = calculateProration(49, 99, periodStart, periodEnd, new Date('2026-02-15'));

    expect(result.daysInPeriod).toBe(28);
    expect(result.daysRemaining).toBe(14);
    // diff = 5000 * (14/28) = 2500
    expect(result.amountAgorot).toBe(2500);
  });

  it('should handle 31-day period', () => {
    const periodStart = new Date('2026-01-01');
    const periodEnd = new Date('2026-02-01'); // 31 days in Jan

    const result = calculateProration(49, 99, periodStart, periodEnd, new Date('2026-01-16'));

    expect(result.daysInPeriod).toBe(31);
    expect(result.daysRemaining).toBe(16);
    // diff = 5000 * (16/31) = 2580.6 -> rounds to 2581
    expect(result.amountAgorot).toBe(2581);
  });

  it('should return 0 charge with zero days remaining', () => {
    const periodStart = new Date('2026-03-01');
    const periodEnd = new Date('2026-03-31');
    const now = new Date('2026-03-31'); // period end

    const result = calculateProration(49, 99, periodStart, periodEnd, now);

    expect(result.amountAgorot).toBe(0);
    expect(result.daysRemaining).toBe(0);
  });

  it('should return negative amount for downgrade (higher to lower price)', () => {
    const periodStart = new Date('2026-03-01');
    const periodEnd = new Date('2026-03-31');
    const now = new Date('2026-03-16');

    const result = calculateProration(99, 49, periodStart, periodEnd, now);

    // diff = (49 - 99) * 100 = -5000 agorot, * 15/30 = -2500
    expect(result.amountAgorot).toBe(-2500);
  });
});
