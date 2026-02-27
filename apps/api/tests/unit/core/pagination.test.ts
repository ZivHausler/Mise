import { describe, it, expect } from 'vitest';
import { parsePaginationParams } from '../../../src/core/types/pagination.js';

describe('parsePaginationParams', () => {
  it('should use defaults when no params given', () => {
    const result = parsePaginationParams();
    expect(result).toEqual({ page: 1, limit: 10, offset: 0 });
  });

  it('should parse valid page and limit', () => {
    const result = parsePaginationParams(3, 20);
    expect(result).toEqual({ page: 3, limit: 20, offset: 40 });
  });

  it('should parse string params (from query strings)', () => {
    const result = parsePaginationParams('2', '15');
    expect(result).toEqual({ page: 2, limit: 15, offset: 15 });
  });

  it('should clamp page to minimum of 1', () => {
    const result = parsePaginationParams(0, 10);
    expect(result.page).toBe(1);
    expect(result.offset).toBe(0);
  });

  it('should clamp negative page to 1', () => {
    const result = parsePaginationParams(-5, 10);
    expect(result.page).toBe(1);
  });

  it('should use defaultLimit when limit is 0 (falsy)', () => {
    const result = parsePaginationParams(1, 0);
    // Number(0) || defaultLimit → uses defaultLimit (10)
    expect(result.limit).toBe(10);
  });

  it('should clamp limit to maxLimit', () => {
    const result = parsePaginationParams(1, 200);
    expect(result.limit).toBe(100);
  });

  it('should use custom defaultLimit', () => {
    const result = parsePaginationParams(undefined, undefined, 25);
    expect(result.limit).toBe(25);
  });

  it('should use custom maxLimit', () => {
    const result = parsePaginationParams(1, 500, 10, 50);
    expect(result.limit).toBe(50);
  });

  it('should handle NaN values gracefully', () => {
    const result = parsePaginationParams('abc', 'xyz');
    expect(result).toEqual({ page: 1, limit: 10, offset: 0 });
  });

  it('should calculate correct offset for large pages', () => {
    const result = parsePaginationParams(10, 50);
    expect(result.offset).toBe(450);
  });
});
