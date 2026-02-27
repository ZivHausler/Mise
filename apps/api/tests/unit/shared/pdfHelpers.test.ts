import { describe, it, expect } from 'vitest';
import { fixRtl, splitBidiSegments, HEBREW_RANGE } from '../../../src/modules/shared/pdf/pdfHelpers.js';

describe('HEBREW_RANGE', () => {
  it('should match Hebrew characters', () => {
    expect(HEBREW_RANGE.test('שלום')).toBe(true);
    expect(HEBREW_RANGE.test('א')).toBe(true);
  });

  it('should not match English characters', () => {
    expect(HEBREW_RANGE.test('Hello')).toBe(false);
    expect(HEBREW_RANGE.test('123')).toBe(false);
  });
});

describe('fixRtl', () => {
  it('should reverse Hebrew text', () => {
    expect(fixRtl('שלום')).toBe('םולש');
  });

  it('should not modify English text', () => {
    expect(fixRtl('Hello')).toBe('Hello');
  });

  it('should not modify numbers', () => {
    expect(fixRtl('12345')).toBe('12345');
  });

  it('should reverse mixed Hebrew text (for labels)', () => {
    const result = fixRtl('שם');
    expect(result).toBe('םש');
  });
});

describe('splitBidiSegments', () => {
  it('should identify pure Hebrew segment', () => {
    const segments = splitBidiSegments('שלום');
    expect(segments).toHaveLength(1);
    expect(segments[0]!.type).toBe('hebrew');
  });

  it('should identify pure LTR segment', () => {
    const segments = splitBidiSegments('Hello');
    expect(segments).toHaveLength(1);
    expect(segments[0]!.type).toBe('ltr');
  });

  it('should split mixed Hebrew and English with space', () => {
    const segments = splitBidiSegments('שלום world');
    expect(segments.length).toBeGreaterThanOrEqual(2);
    expect(segments.some((s) => s.type === 'hebrew')).toBe(true);
    expect(segments.some((s) => s.type === 'ltr')).toBe(true);
  });

  it('should handle spaces as separate segments', () => {
    const segments = splitBidiSegments('a b');
    expect(segments.some((s) => s.type === 'space')).toBe(true);
  });

  it('should handle empty string', () => {
    const segments = splitBidiSegments('');
    expect(segments).toHaveLength(0);
  });

  it('should handle Hebrew with numbers', () => {
    const segments = splitBidiSegments('סה"כ 100');
    // Should have hebrew, space, and ltr segments
    const types = segments.map((s) => s.type);
    expect(types).toContain('hebrew');
    expect(types).toContain('ltr');
  });

  it('should handle only spaces', () => {
    const segments = splitBidiSegments('   ');
    expect(segments.every((s) => s.type === 'space')).toBe(true);
  });
});
