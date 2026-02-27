import { describe, it, expect } from 'vitest';
import { formatDate } from '../../../src/modules/shared/pdf/dateFormat.js';

describe('formatDate', () => {
  it('should format date as dd/mm/yyyy', () => {
    const result = formatDate('2025-03-15', 'dd/mm/yyyy');
    expect(result).toBe('15/03/2025');
  });

  it('should format date as mm/dd/yyyy', () => {
    const result = formatDate('2025-03-15', 'mm/dd/yyyy');
    expect(result).toBe('03/15/2025');
  });

  it('should handle Date object input', () => {
    const result = formatDate(new Date(2025, 0, 5), 'dd/mm/yyyy');
    expect(result).toBe('05/01/2025');
  });

  it('should zero-pad single digit day and month', () => {
    const result = formatDate(new Date(2025, 0, 1), 'dd/mm/yyyy');
    expect(result).toBe('01/01/2025');
  });

  it('should handle December 31st correctly', () => {
    const result = formatDate(new Date(2025, 11, 31), 'dd/mm/yyyy');
    expect(result).toBe('31/12/2025');
  });

  it('should handle leap year date', () => {
    const result = formatDate('2024-02-29', 'dd/mm/yyyy');
    expect(result).toBe('29/02/2024');
  });
});
