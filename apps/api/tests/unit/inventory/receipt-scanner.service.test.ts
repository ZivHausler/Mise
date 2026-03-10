import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock @google/genai (must be before import) ────────────────
const mockGenerateContent = vi.fn();
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContent: mockGenerateContent,
    },
  })),
}));

// ─── Mock env ──────────────────────────────────────────────────
vi.mock('../../../src/config/env.js', () => ({
  env: { GEMINI_API_KEY: 'test-key' },
}));

// ─── Mock InventoryCrud ────────────────────────────────────────
const mockGetAll = vi.fn();
vi.mock('../../../src/modules/inventory/inventoryCrud.js', () => ({
  InventoryCrud: {
    getAll: (...args: unknown[]) => mockGetAll(...args),
  },
}));

import { ReceiptScannerService } from '../../../src/modules/inventory/receipt-scanner.service.js';
import type { Ingredient } from '../../../src/modules/inventory/inventory.types.js';

// ─── Helpers ───────────────────────────────────────────────────

const STORE_ID = 1;
const DUMMY_BUFFER = Buffer.from('fake-image-data');
const MIME_TYPE = 'image/jpeg';

function makeIngredient(overrides: Partial<Ingredient> & { id: number; name: string }): Ingredient {
  return {
    unit: 'kg',
    quantity: 50,
    costPerUnit: 5,
    lowStockThreshold: 10,
    allergens: [],
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  } as Ingredient;
}

function makeGeminiResponse(json: object) {
  return {
    candidates: [
      {
        content: {
          role: 'model',
          parts: [{ text: JSON.stringify(json) }],
        },
      },
    ],
  };
}

const SAMPLE_RECEIPT = {
  items: [
    { name: 'Flour', quantity: 10, unit: 'kg', totalPrice: 50 },
    { name: 'Sugar', quantity: 5, unit: 'kg', totalPrice: 30 },
    { name: 'Vanilla Extract', quantity: 2, unit: 'pcs', totalPrice: 24 },
  ],
  vendor: 'Baker Supply Co',
  date: '2026-03-01',
  total: 104,
};

const SAMPLE_INGREDIENTS: Ingredient[] = [
  makeIngredient({ id: 1, name: 'Flour' }),
  makeIngredient({ id: 2, name: 'Sugar' }),
  makeIngredient({ id: 3, name: 'Butter' }),
  makeIngredient({ id: 4, name: 'Eggs', unit: 'pcs' }),
  makeIngredient({ id: 5, name: 'Vanilla Essence' }),
];

// ─── Tests ─────────────────────────────────────────────────────

describe('ReceiptScannerService', () => {
  let service: ReceiptScannerService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ReceiptScannerService();
    mockGetAll.mockResolvedValue(SAMPLE_INGREDIENTS);
  });

  describe('scanReceipt — Gemini integration', () => {
    it('should extract items from a receipt image via Gemini', async () => {
      mockGenerateContent.mockResolvedValue(makeGeminiResponse(SAMPLE_RECEIPT));

      const result = await service.scanReceipt(STORE_ID, DUMMY_BUFFER, MIME_TYPE);

      expect(result.items).toHaveLength(3);
      expect(result.receiptMeta).toEqual({
        vendor: 'Baker Supply Co',
        date: '2026-03-01',
        total: 104,
      });
      // Verify Gemini was called with the image
      expect(mockGenerateContent).toHaveBeenCalledOnce();
      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.contents[0].parts[0].inlineData.mimeType).toBe(MIME_TYPE);
    });

    it('should handle malformed JSON response from Gemini', async () => {
      mockGenerateContent.mockResolvedValue({
        candidates: [
          {
            content: {
              role: 'model',
              parts: [{ text: 'this is not valid JSON {{{' }],
            },
          },
        ],
      });

      await expect(service.scanReceipt(STORE_ID, DUMMY_BUFFER, MIME_TYPE)).rejects.toThrow();
    });

    it('should handle empty candidates response', async () => {
      mockGenerateContent.mockResolvedValue({ candidates: [] });

      await expect(service.scanReceipt(STORE_ID, DUMMY_BUFFER, MIME_TYPE)).rejects.toThrow(
        'Could not extract items from receipt',
      );
    });

    it('should handle null candidates response', async () => {
      mockGenerateContent.mockResolvedValue({ candidates: null });

      await expect(service.scanReceipt(STORE_ID, DUMMY_BUFFER, MIME_TYPE)).rejects.toThrow(
        'Could not extract items from receipt',
      );
    });

    it('should handle Gemini API errors gracefully', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Gemini API rate limit exceeded'));

      await expect(service.scanReceipt(STORE_ID, DUMMY_BUFFER, MIME_TYPE)).rejects.toThrow(
        'Gemini API rate limit exceeded',
      );
    });

    it('should handle items with empty name or zero quantity via zod defaults', async () => {
      const receiptWithBadItems = {
        items: [
          { name: 'Flour', quantity: 10, unit: 'kg', totalPrice: 50 },
          { name: '', quantity: 5, unit: 'kg', totalPrice: 30 },       // empty name (passes through)
          { name: 'Sugar', quantity: 0, unit: 'kg', totalPrice: 0 },   // zero quantity → defaults to 1 via zod .positive().catch(1)
          { name: 'Butter', quantity: 3, unit: 'kg', totalPrice: 45 },
        ],
        vendor: null,
        date: null,
        total: null,
      };
      mockGenerateContent.mockResolvedValue(makeGeminiResponse(receiptWithBadItems));

      const result = await service.scanReceipt(STORE_ID, DUMMY_BUFFER, MIME_TYPE);

      // All 4 items pass through — zod .catch() fills defaults for invalid fields
      expect(result.items).toHaveLength(4);
      expect(result.items[0].name).toBe('Flour');
      expect(result.items[2].quantity).toBe(1); // zero was replaced by catch default
    });

    it('should handle response without items array — defaults to empty via zod', async () => {
      mockGenerateContent.mockResolvedValue(
        makeGeminiResponse({ vendor: 'test', total: 100 }),
      );

      const result = await service.scanReceipt(STORE_ID, DUMMY_BUFFER, MIME_TYPE);

      // zod .catch([]) fills missing items with empty array
      expect(result.items).toHaveLength(0);
      expect(result.receiptMeta.vendor).toBe('test');
      expect(result.receiptMeta.total).toBe(100);
    });
  });

  describe('scanReceipt — fuzzy matching', () => {
    it('should return exact match with confidence 1.0 and type exact', async () => {
      mockGenerateContent.mockResolvedValue(
        makeGeminiResponse({
          items: [{ name: 'Flour', quantity: 10, unit: 'kg', totalPrice: 50 }],
          vendor: null,
          date: null,
          total: 50,
        }),
      );

      const result = await service.scanReceipt(STORE_ID, DUMMY_BUFFER, MIME_TYPE);

      expect(result.items[0].match).toEqual({
        type: 'exact',
        ingredientId: 1,
        ingredientName: 'Flour',
        confidence: 1,
      });
    });

    it('should match case-insensitively', async () => {
      mockGenerateContent.mockResolvedValue(
        makeGeminiResponse({
          items: [{ name: 'FLOUR', quantity: 10, unit: 'kg', totalPrice: 50 }],
          vendor: null,
          date: null,
          total: 50,
        }),
      );

      const result = await service.scanReceipt(STORE_ID, DUMMY_BUFFER, MIME_TYPE);

      expect(result.items[0].match.type).toBe('exact');
      expect(result.items[0].match.ingredientId).toBe(1);
    });

    it('should return fuzzy match for close Levenshtein names', async () => {
      // "Vanilla Extract" vs "Vanilla Essence" — close enough for fuzzy
      mockGenerateContent.mockResolvedValue(
        makeGeminiResponse({
          items: [{ name: 'Vanilla Extract', quantity: 2, unit: 'pcs', totalPrice: 24 }],
          vendor: null,
          date: null,
          total: 24,
        }),
      );

      const result = await service.scanReceipt(STORE_ID, DUMMY_BUFFER, MIME_TYPE);

      expect(result.items[0].match.type).toBe('fuzzy');
      expect(result.items[0].match.ingredientId).toBe(5); // Vanilla Essence
      expect(result.items[0].match.confidence).toBeGreaterThan(0.6);
      expect(result.items[0].match.confidence).toBeLessThan(1);
    });

    it('should return type none with confidence 0 for unrecognized items', async () => {
      mockGenerateContent.mockResolvedValue(
        makeGeminiResponse({
          items: [{ name: 'Dragon Fruit Powder', quantity: 1, unit: 'kg', totalPrice: 80 }],
          vendor: null,
          date: null,
          total: 80,
        }),
      );

      const result = await service.scanReceipt(STORE_ID, DUMMY_BUFFER, MIME_TYPE);

      expect(result.items[0].match).toEqual({
        type: 'none',
        ingredientId: null,
        ingredientName: null,
        confidence: 0,
      });
    });

    it('should handle empty ingredient list — all items unmatched', async () => {
      mockGetAll.mockResolvedValue([]);
      mockGenerateContent.mockResolvedValue(
        makeGeminiResponse({
          items: [
            { name: 'Flour', quantity: 10, unit: 'kg', totalPrice: 50 },
            { name: 'Sugar', quantity: 5, unit: 'kg', totalPrice: 30 },
          ],
          vendor: null,
          date: null,
          total: 80,
        }),
      );

      const result = await service.scanReceipt(STORE_ID, DUMMY_BUFFER, MIME_TYPE);

      expect(result.items).toHaveLength(2);
      result.items.forEach((item) => {
        expect(item.match.type).toBe('none');
        expect(item.match.confidence).toBe(0);
      });
    });

    it('should handle empty extracted items — returns empty array', async () => {
      mockGenerateContent.mockResolvedValue(
        makeGeminiResponse({
          items: [],
          vendor: 'Test Vendor',
          date: null,
          total: 0,
        }),
      );

      const result = await service.scanReceipt(STORE_ID, DUMMY_BUFFER, MIME_TYPE);

      expect(result.items).toHaveLength(0);
      expect(result.receiptMeta.vendor).toBe('Test Vendor');
    });

    it('should strip Hebrew niqqud for matching', async () => {
      // Use the same consonants with and without niqqud.
      // "קֶמַח" (with niqqud) should match "קמח" (without niqqud) — same consonants.
      mockGetAll.mockResolvedValue([
        makeIngredient({ id: 10, name: 'קמח' }),
      ]);
      mockGenerateContent.mockResolvedValue(
        makeGeminiResponse({
          items: [{ name: 'קֶמַח', quantity: 5, unit: 'kg', totalPrice: 30 }],
          vendor: null,
          date: null,
          total: 30,
        }),
      );

      const result = await service.scanReceipt(STORE_ID, DUMMY_BUFFER, MIME_TYPE);

      expect(result.items[0].match.type).toBe('exact');
      expect(result.items[0].match.ingredientId).toBe(10);
    });

    it('should remove parenthetical suffixes for matching', async () => {
      mockGetAll.mockResolvedValue([
        makeIngredient({ id: 20, name: 'Butter' }),
      ]);
      mockGenerateContent.mockResolvedValue(
        makeGeminiResponse({
          items: [{ name: 'Butter (unsalted)', quantity: 2, unit: 'kg', totalPrice: 40 }],
          vendor: null,
          date: null,
          total: 40,
        }),
      );

      const result = await service.scanReceipt(STORE_ID, DUMMY_BUFFER, MIME_TYPE);

      expect(result.items[0].match.type).toBe('exact');
      expect(result.items[0].match.ingredientId).toBe(20);
    });

    it('should calculate unitPrice correctly', async () => {
      mockGenerateContent.mockResolvedValue(
        makeGeminiResponse({
          items: [{ name: 'Flour', quantity: 5, unit: 'kg', totalPrice: 25 }],
          vendor: null,
          date: null,
          total: 25,
        }),
      );

      const result = await service.scanReceipt(STORE_ID, DUMMY_BUFFER, MIME_TYPE);

      expect(result.items[0].unitPrice).toBe(5); // 25 / 5
    });

    it('should handle mixed match results — some exact, some fuzzy, some none', async () => {
      mockGenerateContent.mockResolvedValue(makeGeminiResponse(SAMPLE_RECEIPT));

      const result = await service.scanReceipt(STORE_ID, DUMMY_BUFFER, MIME_TYPE);

      const types = result.items.map((i) => i.match.type);
      expect(types[0]).toBe('exact');  // Flour -> Flour
      expect(types[1]).toBe('exact');  // Sugar -> Sugar
      // Vanilla Extract -> Vanilla Essence (fuzzy) or none depending on threshold
      expect(['fuzzy', 'none']).toContain(types[2]);
    });
  });
});
