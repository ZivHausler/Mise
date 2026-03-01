import { describe, it, expect } from 'vitest';
import { chatRequestSchema } from '../../../src/modules/ai-chat/ai-chat.schema.js';

describe('chatRequestSchema', () => {
  it('should accept a valid request with defaults', () => {
    const result = chatRequestSchema.parse({ message: 'Hello' });
    expect(result.message).toBe('Hello');
    expect(result.history).toEqual([]);
    expect(result.language).toBe('he');
  });

  it('should accept a valid request with all fields', () => {
    const result = chatRequestSchema.parse({
      message: 'Show me orders',
      history: [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'Hello!' },
      ],
      language: 'en',
    });
    expect(result.message).toBe('Show me orders');
    expect(result.history).toHaveLength(2);
    expect(result.language).toBe('en');
  });

  it('should reject an empty message', () => {
    expect(() => chatRequestSchema.parse({ message: '' })).toThrow();
  });

  it('should reject a message over 2000 characters', () => {
    expect(() => chatRequestSchema.parse({ message: 'x'.repeat(2001) })).toThrow();
  });

  it('should accept a message of exactly 2000 characters', () => {
    const result = chatRequestSchema.parse({ message: 'x'.repeat(2000) });
    expect(result.message).toHaveLength(2000);
  });

  it('should reject history with more than 20 messages', () => {
    const history = Array.from({ length: 21 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' as const : 'assistant' as const,
      content: `msg ${i}`,
    }));
    expect(() => chatRequestSchema.parse({ message: 'Hi', history })).toThrow();
  });

  it('should accept history with exactly 20 messages', () => {
    const history = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' as const : 'assistant' as const,
      content: `msg ${i}`,
    }));
    const result = chatRequestSchema.parse({ message: 'Hi', history });
    expect(result.history).toHaveLength(20);
  });

  it('should reject invalid role in history', () => {
    expect(() =>
      chatRequestSchema.parse({
        message: 'Hi',
        history: [{ role: 'system', content: 'bad' }],
      }),
    ).toThrow();
  });

  it('should default language to "he" when missing', () => {
    const result = chatRequestSchema.parse({ message: 'Hi' });
    expect(result.language).toBe('he');
  });

  it('should reject invalid language', () => {
    expect(() =>
      chatRequestSchema.parse({ message: 'Hi', language: 'fr' }),
    ).toThrow();
  });

  it('should accept "en" language', () => {
    const result = chatRequestSchema.parse({ message: 'Hi', language: 'en' });
    expect(result.language).toBe('en');
  });

  it('should accept "he" language', () => {
    const result = chatRequestSchema.parse({ message: 'Hi', language: 'he' });
    expect(result.language).toBe('he');
  });

  it('should reject missing message field', () => {
    expect(() => chatRequestSchema.parse({})).toThrow();
  });
});
