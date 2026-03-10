import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { InventoryCrud } from './inventoryCrud.js';
import { AppError, ValidationError } from '../../core/errors/app-error.js';
import { ErrorCode } from '@mise/shared';
import type { ExtractedReceipt, MatchedItem, ScanResult, Ingredient } from './inventory.types.js';

const extractedReceiptSchema = z.object({
  items: z.array(z.object({
    name: z.string().max(500),
    quantity: z.number().positive().max(1000000).catch(1),
    unit: z.enum(['kg', 'g', 'l', 'ml', 'pcs']).catch('pcs'),
    totalPrice: z.number().min(0).max(100000000).catch(0),
  })).catch([]),
  vendor: z.string().max(500).nullable().catch(null),
  date: z.string().max(20).nullable().catch(null),
  total: z.number().min(0).max(100000000).nullable().catch(null),
});

const matchResultSchema = z.object({
  matches: z.array(z.object({
    receiptIndex: z.number(),
    ingredientId: z.number().nullable(),
    confidence: z.number().min(0).max(1),
  })),
});

const MODEL = 'gemini-2.5-flash';

// ─── Local matching helpers ────────────────────────────────────

/** Strip Hebrew niqqud (diacritical marks) from a string */
function stripNiqqud(s: string): string {
  // Hebrew niqqud range: U+0591–U+05C7
  return s.replace(/[\u0591-\u05C7]/g, '');
}

/** Remove parenthetical suffixes like "(unsalted)" */
function stripParenthetical(s: string): string {
  return s.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

/** Normalize a name for matching: lowercase, strip niqqud, strip parenthetical */
function normalizeName(s: string): string {
  return stripParenthetical(stripNiqqud(s)).toLowerCase().trim();
}

/** Simple Levenshtein distance */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/** Try to match an item name against ingredients locally. Returns match or null. */
function localMatch(
  itemName: string,
  ingredients: Ingredient[],
): { ingredientId: number; ingredientName: string; confidence: number; type: 'exact' | 'fuzzy' } | null {
  const normalized = normalizeName(itemName);
  if (!normalized) return null;

  // 1. Exact match (after normalization)
  for (const ing of ingredients) {
    if (normalizeName(ing.name) === normalized) {
      return { ingredientId: ing.id, ingredientName: ing.name, confidence: 1, type: 'exact' };
    }
  }

  // 2. Fuzzy match via Levenshtein
  let bestMatch: { ingredientId: number; ingredientName: string; confidence: number } | null = null;
  for (const ing of ingredients) {
    const ingNorm = normalizeName(ing.name);
    const maxLen = Math.max(normalized.length, ingNorm.length);
    if (maxLen === 0) continue;
    const dist = levenshtein(normalized, ingNorm);
    const similarity = 1 - dist / maxLen;
    if (similarity >= 0.6 && (!bestMatch || similarity > bestMatch.confidence)) {
      bestMatch = { ingredientId: ing.id, ingredientName: ing.name, confidence: Math.round(similarity * 100) / 100 };
    }
  }

  if (bestMatch) {
    return { ...bestMatch, type: bestMatch.confidence >= 1 ? 'exact' : 'fuzzy' };
  }

  return null;
}

const RECEIPT_PROMPT = `You are a receipt parser for a bakery supply system. Extract all purchased items from this receipt image or PDF document.

The receipt may be in Hebrew or English. Extract ALL line items.

Return a JSON object with this exact structure:
{
  "items": [
    {
      "name": "item name (in original language from receipt)",
      "quantity": 5,
      "unit": "kg",
      "totalPrice": 150.00
    }
  ],
  "vendor": "supplier name or null",
  "date": "YYYY-MM-DD or null",
  "total": 500.00
}

Rules:
- "unit" must be one of: kg, g, l, ml, pcs
- If unit is ambiguous, use "pcs"
- "quantity" must be a positive number. Default to 1 if not clear.
- "totalPrice" is the total price for that line (quantity * unit price)
- If you cannot determine a field, use null
- Do NOT include tax lines, discount lines, or subtotal lines as items
- Include ONLY physical product items
- Exclude carrier bag charges and checkout bags (e.g. שקיות גופיה, שקיות, קופה, bags, carrier bags). However, DO include bags that are actual products like trash bags (שקיות זבל), freezer bags, etc.`;

function getClient(): GoogleGenAI {
  if (!env.GEMINI_API_KEY) {
    throw new AppError('Receipt scanning is not configured', 503, ErrorCode.FEATURE_DISABLED);
  }
  return new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
}

async function extractItemsFromReceipt(imageBuffer: Buffer, mimeType: string): Promise<ExtractedReceipt> {
  const ai = getClient();
  const base64Image = imageBuffer.toString('base64');

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Image,
            },
          },
          { text: RECEIPT_PROMPT },
        ],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      temperature: 0.1,
      maxOutputTokens: 16384,
    },
  });

  const finishReason = response.candidates?.[0]?.finishReason;
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new ValidationError('Could not extract items from receipt', ErrorCode.VALIDATION_ERROR);
  }

  if (finishReason === 'MAX_TOKENS') {
    throw new ValidationError('Receipt is too large to process. Try scanning fewer pages.', ErrorCode.VALIDATION_ERROR);
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new ValidationError('Could not parse receipt data — the receipt may be too large or unclear', ErrorCode.VALIDATION_ERROR);
  }

  const parsed = extractedReceiptSchema.parse(json);
  parsed.items = parsed.items.slice(0, 50);

  return parsed;
}

async function matchItems(
  extractedItems: ExtractedReceipt['items'],
  ingredients: Ingredient[],
): Promise<MatchedItem[]> {
  if (extractedItems.length === 0) return [];

  // 1. Try local matching first (exact + fuzzy text comparison)
  const results: MatchedItem[] = [];
  const unmatchedIndices: number[] = [];

  for (let i = 0; i < extractedItems.length; i++) {
    const item = extractedItems[i];
    const unitPrice = item.quantity > 0 ? item.totalPrice / item.quantity : item.totalPrice;
    const match = localMatch(item.name, ingredients);

    if (match) {
      results.push({
        ...item,
        unitPrice,
        match: {
          type: match.type,
          ingredientId: match.ingredientId,
          ingredientName: match.ingredientName,
          confidence: match.confidence,
        },
      });
    } else {
      unmatchedIndices.push(i);
      results.push({
        ...item,
        unitPrice,
        match: { type: 'none' as const, ingredientId: null, ingredientName: null, confidence: 0 },
      });
    }
  }

  // 2. For remaining unmatched items, try AI matching
  if (unmatchedIndices.length > 0 && ingredients.length > 0) {
    const unmatchedItems = unmatchedIndices.map((i) => extractedItems[i]);
    const ingredientList = ingredients.map((ing) => ({ id: ing.id, name: ing.name }));

    const prompt = `You are matching receipt items to a store's ingredient inventory.

Receipt items:
${unmatchedItems.map((item, i) => `${i}: "${item.name}"`).join('\n')}

Store ingredients:
${ingredientList.map((ing) => `${ing.id}: "${ing.name}"`).join('\n')}

Match each receipt item to the most likely ingredient from the store's inventory.
Consider that:
- Items may be in Hebrew or English
- Receipt names are often abbreviated, have extra words, or use different forms (e.g. plural, with brand name, with flavor/variant)
- A receipt item with brand/flavor details (e.g. "מסטיק מנטוס מנטה") SHOULD match a generic ingredient (e.g. "מסטיק" or "gum") — the store tracks the general category
- Hebrew final-form letters (ן/נ, ם/מ, ך/כ, ף/פ, ץ/צ) should be treated as identical
- Match items that belong to the same product category. Do NOT match completely unrelated items.

Return JSON:
{
  "matches": [
    { "receiptIndex": 0, "ingredientId": 123, "confidence": 0.95 },
    { "receiptIndex": 1, "ingredientId": null, "confidence": 0 }
  ]
}

Rules:
- Return one entry per receipt item (use the index from the list above)
- "ingredientId" is the store ingredient ID, or null if no match
- "confidence" is 0-1 (1 = certain match, 0 = no match)
- Only match if confidence >= 0.6. Below that, set ingredientId to null.`;

    try {
      const ai = getClient();
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
          maxOutputTokens: 2048,
        },
      });

      const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
      const ingredientById = new Map(ingredients.map((ing) => [ing.id, ing.name]));

      if (text) {
        const parsed = matchResultSchema.parse(JSON.parse(text));
        for (const aiMatch of parsed.matches) {
          const originalIdx = unmatchedIndices[aiMatch.receiptIndex];
          if (originalIdx == null) continue;
          if (aiMatch.ingredientId != null && ingredientById.has(aiMatch.ingredientId)) {
            results[originalIdx] = {
              ...results[originalIdx],
              match: {
                type: (aiMatch.confidence >= 1 ? 'exact' : 'fuzzy') as 'exact' | 'fuzzy',
                ingredientId: aiMatch.ingredientId,
                ingredientName: ingredientById.get(aiMatch.ingredientId) ?? null,
                confidence: Math.round(aiMatch.confidence * 100) / 100,
              },
            };
          }
        }
      }
    } catch {
      // AI matching failed — keep local results (already set to 'none')
    }
  }

  return results;
}

export class ReceiptScannerService {
  async scanReceipt(storeId: number, imageBuffer: Buffer, mimeType: string): Promise<ScanResult> {
    const [extracted, ingredients] = await Promise.all([
      extractItemsFromReceipt(imageBuffer, mimeType),
      InventoryCrud.getAll(storeId),
    ]);

    const matchedItems = await matchItems(extracted.items, ingredients);

    return {
      items: matchedItems,
      receiptMeta: {
        vendor: extracted.vendor,
        date: extracted.date,
        total: extracted.total,
      },
    };
  }
}
