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

async function matchItemsWithAI(
  extractedItems: ExtractedReceipt['items'],
  ingredients: Ingredient[],
): Promise<MatchedItem[]> {
  if (extractedItems.length === 0) return [];

  const ingredientList = ingredients.map((ing) => ({ id: ing.id, name: ing.name }));

  const prompt = `You are matching receipt items to a store's ingredient inventory.

Receipt items:
${extractedItems.map((item, i) => `${i}: "${item.name}"`).join('\n')}

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

  // Parse AI matches, falling back to no matches on failure
  let aiMatches: Array<{ receiptIndex: number; ingredientId: number | null; confidence: number }> = [];
  if (text) {
    try {
      const parsed = matchResultSchema.parse(JSON.parse(text));
      aiMatches = parsed.matches;
    } catch {
      // If AI response is malformed, fall back to no matches
    }
  }

  const matchMap = new Map(aiMatches.map((m) => [m.receiptIndex, m]));

  return extractedItems.map((item, idx) => {
    const unitPrice = item.quantity > 0 ? item.totalPrice / item.quantity : item.totalPrice;
    const aiMatch = matchMap.get(idx);

    if (aiMatch?.ingredientId != null && ingredientById.has(aiMatch.ingredientId)) {
      return {
        ...item,
        unitPrice,
        match: {
          type: (aiMatch.confidence >= 1 ? 'exact' : 'fuzzy') as 'exact' | 'fuzzy',
          ingredientId: aiMatch.ingredientId,
          ingredientName: ingredientById.get(aiMatch.ingredientId) ?? null,
          confidence: Math.round(aiMatch.confidence * 100) / 100,
        },
      };
    }

    return {
      ...item,
      unitPrice,
      match: {
        type: 'none' as const,
        ingredientId: null,
        ingredientName: null,
        confidence: 0,
      },
    };
  });
}

export class ReceiptScannerService {
  async scanReceipt(storeId: number, imageBuffer: Buffer, mimeType: string): Promise<ScanResult> {
    const [extracted, ingredients] = await Promise.all([
      extractItemsFromReceipt(imageBuffer, mimeType),
      InventoryCrud.getAll(storeId),
    ]);

    const matchedItems = await matchItemsWithAI(extracted.items, ingredients);

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
