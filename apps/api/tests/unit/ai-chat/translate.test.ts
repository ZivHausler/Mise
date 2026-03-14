import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @google/genai
const mockGenerateContent = vi.fn();
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContent: mockGenerateContent,
    },
  })),
}));

// Mock env
vi.mock('../../../src/config/env.js', () => ({
  env: { GEMINI_API_KEY: 'test-key' },
}));

// Mock tools (required by ai-chat.service module)
vi.mock('../../../src/modules/ai-chat/ai-chat.tools.js', () => ({
  toolDeclarations: [],
  executeToolCall: vi.fn(),
}));

import { translateHebrewToEnglish } from '../../../src/modules/ai-chat/ai-chat.service.js';
import { translateRequestSchema } from '../../../src/modules/ai-chat/ai-chat.schema.js';
import { InternalError } from '../../../src/core/errors/app-error.js';

function makeTranslationResponse(text: string) {
  return {
    candidates: [
      {
        content: {
          role: 'model',
          parts: [{ text }],
        },
      },
    ],
  };
}

describe('translateHebrewToEnglish', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Valid name translation
  it('returns translated name from Gemini response', async () => {
    mockGenerateContent.mockResolvedValue(makeTranslationResponse('Chocolate Cake'));

    const result = await translateHebrewToEnglish('עוגת שוקולד', 'name');

    expect(result).toBe('Chocolate Cake');
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  // 2. Valid description translation
  it('returns translated description from Gemini response', async () => {
    mockGenerateContent.mockResolvedValue(
      makeTranslationResponse('Rich chocolate cake with ganache frosting'),
    );

    const result = await translateHebrewToEnglish(
      'עוגת שוקולד עשירה עם ציפוי גנאש',
      'description',
    );

    expect(result).toBe('Rich chocolate cake with ganache frosting');
  });

  // 6. Gemini returns empty response
  it('throws InternalError when Gemini returns empty response', async () => {
    mockGenerateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            role: 'model',
            parts: [{ text: '' }],
          },
        },
      ],
    });

    await expect(translateHebrewToEnglish('עוגה', 'name')).rejects.toThrow(InternalError);
    await expect(translateHebrewToEnglish('עוגה', 'name')).rejects.toThrow(
      'Translation returned empty result',
    );
  });

  it('throws InternalError when candidates are missing', async () => {
    mockGenerateContent.mockResolvedValue({ candidates: [] });

    await expect(translateHebrewToEnglish('עוגה', 'name')).rejects.toThrow(InternalError);
  });

  it('throws InternalError when candidates is undefined', async () => {
    mockGenerateContent.mockResolvedValue({});

    await expect(translateHebrewToEnglish('עוגה', 'name')).rejects.toThrow(InternalError);
  });

  // 7. Gemini returns markdown — service should strip it
  it('strips markdown bold from Gemini response', async () => {
    mockGenerateContent.mockResolvedValue(makeTranslationResponse('**Chocolate Cake**'));

    const result = await translateHebrewToEnglish('עוגת שוקולד', 'name');

    expect(result).toBe('Chocolate Cake');
  });

  it('strips markdown italic from Gemini response', async () => {
    mockGenerateContent.mockResolvedValue(makeTranslationResponse('_Chocolate Cake_'));

    const result = await translateHebrewToEnglish('עוגת שוקולד', 'name');

    expect(result).toBe('Chocolate Cake');
  });

  it('strips backticks from Gemini response', async () => {
    mockGenerateContent.mockResolvedValue(makeTranslationResponse('`Chocolate Cake`'));

    const result = await translateHebrewToEnglish('עוגת שוקולד', 'name');

    expect(result).toBe('Chocolate Cake');
  });

  it('strips heading markers from Gemini response', async () => {
    mockGenerateContent.mockResolvedValue(makeTranslationResponse('# Chocolate Cake'));

    const result = await translateHebrewToEnglish('עוגת שוקולד', 'name');

    expect(result).toBe('Chocolate Cake');
  });

  it('strips mixed markdown characters from response', async () => {
    mockGenerateContent.mockResolvedValue(makeTranslationResponse('**_`Chocolate Cake`_**'));

    const result = await translateHebrewToEnglish('עוגת שוקולד', 'name');

    expect(result).toBe('Chocolate Cake');
  });

  // 8. Gemini API error — service should throw InternalError
  it('throws InternalError with user-friendly message when Gemini API fails', async () => {
    mockGenerateContent.mockRejectedValue(new Error('API quota exceeded'));

    await expect(translateHebrewToEnglish('עוגה', 'name')).rejects.toThrow(InternalError);
    await expect(translateHebrewToEnglish('עוגה', 'name')).rejects.toThrow(
      'Translation service temporarily unavailable',
    );
  });

  it('throws InternalError when Gemini throws a network error', async () => {
    mockGenerateContent.mockRejectedValue(new Error('ECONNRESET'));

    await expect(translateHebrewToEnglish('חלה', 'name')).rejects.toThrow(
      'Translation service temporarily unavailable',
    );
  });

  // 9. Name prompt uses correct format
  it('sends correct prompt format for name fieldType', async () => {
    mockGenerateContent.mockResolvedValue(makeTranslationResponse('Challah'));

    await translateHebrewToEnglish('חלה', 'name');

    const callArgs = mockGenerateContent.mock.calls[0][0];
    const promptText = callArgs.contents[0].parts[0].text;

    expect(promptText).toContain('bakery product/item name');
    expect(promptText).toContain('Hebrew to English');
    expect(promptText).toContain('1-5 words');
    expect(promptText).toContain('Hebrew name: חלה');
    expect(promptText).toContain('no markdown');
  });

  // 10. Description prompt uses correct format
  it('sends correct prompt format for description fieldType', async () => {
    mockGenerateContent.mockResolvedValue(
      makeTranslationResponse('A traditional braided bread'),
    );

    await translateHebrewToEnglish('לחם קלוע מסורתי', 'description');

    const callArgs = mockGenerateContent.mock.calls[0][0];
    const promptText = callArgs.contents[0].parts[0].text;

    expect(promptText).toContain('bakery product description');
    expect(promptText).toContain('Hebrew to English');
    expect(promptText).toContain('Maintain the original tone');
    expect(promptText).toContain('Hebrew description: לחם קלוע מסורתי');
    expect(promptText).toContain('no markdown');
  });

  // Verify Gemini config parameters
  it('uses correct Gemini config (temperature 0.2, maxOutputTokens 256)', async () => {
    mockGenerateContent.mockResolvedValue(makeTranslationResponse('Babka'));

    await translateHebrewToEnglish('בבקה', 'name');

    const callArgs = mockGenerateContent.mock.calls[0][0];
    expect(callArgs.config.temperature).toBe(0.2);
    expect(callArgs.config.maxOutputTokens).toBe(256);
  });

  // Verify model name
  it('uses gemini-2.5-flash model', async () => {
    mockGenerateContent.mockResolvedValue(makeTranslationResponse('Babka'));

    await translateHebrewToEnglish('בבקה', 'name');

    const callArgs = mockGenerateContent.mock.calls[0][0];
    expect(callArgs.model).toBe('gemini-2.5-flash');
  });

  // Response with only whitespace after stripping markdown
  it('throws InternalError when response is only whitespace', async () => {
    mockGenerateContent.mockResolvedValue(makeTranslationResponse('   '));

    await expect(translateHebrewToEnglish('עוגה', 'name')).rejects.toThrow(
      'Translation returned empty result',
    );
  });

  // Response with only markdown characters
  it('throws InternalError when response is only markdown characters', async () => {
    mockGenerateContent.mockResolvedValue(makeTranslationResponse('***'));

    await expect(translateHebrewToEnglish('עוגה', 'name')).rejects.toThrow(
      'Translation returned empty result',
    );
  });

  // Multi-part response
  it('joins multiple text parts from Gemini response', async () => {
    mockGenerateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            role: 'model',
            parts: [{ text: 'Chocolate ' }, { text: 'Cake' }],
          },
        },
      ],
    });

    const result = await translateHebrewToEnglish('עוגת שוקולד', 'name');
    expect(result).toBe('Chocolate Cake');
  });
});

describe('translateRequestSchema', () => {
  // 3. Empty text after trim
  it('rejects empty text', () => {
    expect(() =>
      translateRequestSchema.parse({ text: '', fieldType: 'name' }),
    ).toThrow();
  });

  it('rejects whitespace-only text (trimmed to empty)', () => {
    expect(() =>
      translateRequestSchema.parse({ text: '   ', fieldType: 'name' }),
    ).toThrow();
  });

  // 4. Text exceeding 1000 chars
  it('rejects text exceeding 1000 characters', () => {
    expect(() =>
      translateRequestSchema.parse({ text: 'א'.repeat(1001), fieldType: 'name' }),
    ).toThrow();
  });

  it('accepts text of exactly 1000 characters', () => {
    const result = translateRequestSchema.parse({
      text: 'א'.repeat(1000),
      fieldType: 'name',
    });
    expect(result.text).toHaveLength(1000);
  });

  // 5. Invalid fieldType
  it('rejects invalid fieldType', () => {
    expect(() =>
      translateRequestSchema.parse({ text: 'עוגה', fieldType: 'title' }),
    ).toThrow();
  });

  it('rejects missing fieldType', () => {
    expect(() => translateRequestSchema.parse({ text: 'עוגה' })).toThrow();
  });

  // Valid cases
  it('accepts valid name request', () => {
    const result = translateRequestSchema.parse({
      text: 'עוגת שוקולד',
      fieldType: 'name',
    });
    expect(result.text).toBe('עוגת שוקולד');
    expect(result.fieldType).toBe('name');
  });

  it('accepts valid description request', () => {
    const result = translateRequestSchema.parse({
      text: 'עוגת שוקולד עשירה עם ציפוי גנאש',
      fieldType: 'description',
    });
    expect(result.fieldType).toBe('description');
  });

  it('trims whitespace from text', () => {
    const result = translateRequestSchema.parse({
      text: '  עוגה  ',
      fieldType: 'name',
    });
    expect(result.text).toBe('עוגה');
  });

  it('rejects missing text field', () => {
    expect(() => translateRequestSchema.parse({ fieldType: 'name' })).toThrow();
  });
});
