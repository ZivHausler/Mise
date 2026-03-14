/**
 * sync-recipe-tags.mjs
 * Syncs MongoDB recipe tags to PostgreSQL recipe_tags table with English translations.
 * Run from: apps/api/
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const require = createRequire(import.meta.url);

const { MongoClient } = require('mongodb');
const { Pool } = require('pg');

// ── Hebrew → English tag translation map ────────────────────────────────────
const TRANSLATIONS = {
  'שוקולד': 'Chocolate',
  'צרפתי': 'French',
  'פרמיום': 'Premium',
  'עוגה': 'Cake',
  'ארוחת בוקר': 'Breakfast',
  'קלאסי': 'Classic',
  'אמריקאי': 'American',
  'לחם': 'Bread',
  'עוגיות': 'Cookies',
  'לחמניות': 'Rolls',
  'תפוחים': 'Apples',
  'ירושלמי': 'Jerusalem',
  'שומשום': 'Sesame',
  'מרנג': 'Meringue',
  'קרואסון': 'Croissant',
  'ישראלי': 'Israeli',
  'פאדג': 'Fudge',
  'פאדג\'': 'Fudge',
  'שכבות': 'Layered',
  'עדין': 'Delicate',
  'שאור': 'Sourdough',
  'טבעי': 'Natural',
  'מאפינס': 'Muffins',
  'קינוח': 'Dessert',
  'קרמי': 'Creamy',
  'חמאה': 'Butter',
  'טארט': 'Tart',
  'פאי': 'Pie',
  'מאפה': 'Pastry',
  'בייגלה': 'Bagel',
  'בראוניז': 'Brownies',
  'מתוק': 'Sweet',
  'אוכמניות': 'Blueberries',
  'אירועים': 'Events',
  'לימון': 'Lemon',
  'סינבון': 'Cinnamon Roll',
  'קינמון': 'Cinnamon',
  'גבינה': 'Cheese',
  'קונדיטוריה': 'Patisserie',
  'ארטיזאנל': 'Artisanal',
  'מקרון': 'Macaron',
  'ילדים': 'Kids',
  'ריבוע': 'Square',
  'טבעוני': 'Vegan',
  'ללא גלוטן': 'Gluten-free',
  'פרווה': 'Pareve',
  'חלבי': 'Dairy',
  'בשרי': 'Meat',
  'מלוח': 'Savory',
  'איטלקי': 'Italian',
  'יפני': 'Japanese',
  'מקסיקני': 'Mexican',
  'תאילנדי': 'Thai',
  'הודי': 'Indian',
  'גרוזיני': 'Georgian',
  'מרוקאי': 'Moroccan',
  'בורגר': 'Burger',
  'פיצה': 'Pizza',
  'סושי': 'Sushi',
  'פלאפל': 'Falafel',
  'שווארמה': 'Shawarma',
  'צ\'ורוס': 'Churros',
  'גלידה': 'Ice Cream',
  'מיץ': 'Juice',
  'שייק': 'Shake',
  'קפה': 'Coffee',
  'טעים': 'Tasty',
  'חריף': 'Spicy',
  'טרי': 'Fresh',
  'ביתי': 'Homemade',
  'מסורתי': 'Traditional',
  'מנה עיקרית': 'Main Course',
  'תוספות': 'Sides',
  'מרק': 'Soup',
  'סלט': 'Salad',
  'ספיישל': 'Special',
};

/**
 * For a given tag string, return an English translation.
 * Falls back to simple transliteration helpers or the tag itself if latin.
 */
function translateTag(tag) {
  if (!tag) return null;
  const trimmed = tag.trim();

  // Direct lookup
  if (TRANSLATIONS[trimmed]) return TRANSLATIONS[trimmed];

  // Check if already Latin (no Hebrew characters)
  const hebrewPattern = /[\u0590-\u05FF]/;
  if (!hebrewPattern.test(trimmed)) {
    // Already English / Latin — capitalise first letter and return as-is
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }

  // Partial match: check if any key is contained in the tag
  for (const [he, en] of Object.entries(TRANSLATIONS)) {
    if (trimmed.includes(he)) return en;
  }

  // Hebrew transliteration map for individual characters/pairs
  const charMap = {
    'א': 'a', 'ב': 'b', 'ג': 'g', 'ד': 'd', 'ה': 'h', 'ו': 'v',
    'ז': 'z', 'ח': 'ch', 'ט': 't', 'י': 'y', 'כ': 'k', 'ך': 'k',
    'ל': 'l', 'מ': 'm', 'ם': 'm', 'נ': 'n', 'ן': 'n', 'ס': 's',
    'ע': 'a', 'פ': 'p', 'ף': 'f', 'צ': 'tz', 'ץ': 'tz', 'ק': 'k',
    'ר': 'r', 'ש': 'sh', 'ת': 't',
    '\u05BC': '', '\u05B7': 'a', '\u05B8': 'a', '\u05B4': 'i',
    '\u05B5': 'e', '\u05B9': 'o', '\u05BB': 'u',
  };

  let transliterated = '';
  for (const ch of trimmed) {
    transliterated += charMap[ch] ?? (hebrewPattern.test(ch) ? '' : ch);
  }
  // Capitalise
  transliterated = transliterated.trim();
  return transliterated
    ? transliterated.charAt(0).toUpperCase() + transliterated.slice(1)
    : trimmed;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const mongoClient = new MongoClient('mongodb://localhost:27017/mise');
  const pgPool = new Pool({ connectionString: 'postgresql://mise:mise@localhost:5432/mise' });

  let totalAdded = 0;
  let totalUpdated = 0;

  try {
    await mongoClient.connect();
    const mongoDb = mongoClient.db('mise');

    // 1. Fetch all store IDs from PostgreSQL
    const storesResult = await pgPool.query('SELECT id, name FROM stores ORDER BY id');
    const stores = storesResult.rows;
    console.log(`Found ${stores.length} stores in PostgreSQL.\n`);

    for (const store of stores) {
      const storeId = store.id;
      const storeName = store.name;

      // 2. Get all unique tags for this store from MongoDB
      const mongoCursor = await mongoDb.collection('recipes').aggregate([
        { $match: { storeId: storeId } },
        { $unwind: '$tags' },
        { $group: { _id: '$tags' } },
      ]).toArray();

      const mongoTags = mongoCursor
        .map(doc => (typeof doc._id === 'string' ? doc._id.trim() : null))
        .filter(Boolean);

      if (mongoTags.length === 0) {
        // No MongoDB recipes for this store — skip silently
        continue;
      }

      // 3. Get existing tags from PostgreSQL for this store
      const pgResult = await pgPool.query(
        'SELECT name, name_en FROM recipe_tags WHERE store_id = $1',
        [storeId]
      );
      const pgTagMap = new Map(pgResult.rows.map(r => [r.name, r.name_en]));

      let storeAdded = 0;
      let storeUpdated = 0;

      for (const tag of mongoTags) {
        const translation = translateTag(tag);

        if (!pgTagMap.has(tag)) {
          // INSERT new tag
          await pgPool.query(
            'INSERT INTO recipe_tags (store_id, name, name_en) VALUES ($1, $2, $3) ON CONFLICT (store_id, name) DO NOTHING',
            [storeId, tag, translation]
          );
          storeAdded++;
          totalAdded++;
          console.log(`  [ADD]    store=${storeId} (${storeName}) tag="${tag}" → "${translation}"`);
        } else if (pgTagMap.get(tag) === null || pgTagMap.get(tag) === undefined) {
          // UPDATE existing tag that has no English translation
          await pgPool.query(
            'UPDATE recipe_tags SET name_en = $1 WHERE store_id = $2 AND name = $3',
            [translation, storeId, tag]
          );
          storeUpdated++;
          totalUpdated++;
          console.log(`  [UPDATE] store=${storeId} (${storeName}) tag="${tag}" → "${translation}"`);
        }
        // else: tag exists and already has a translation — skip
      }

      if (storeAdded > 0 || storeUpdated > 0) {
        console.log(`  → Store ${storeId} "${storeName}": +${storeAdded} added, ~${storeUpdated} updated\n`);
      }
    }

    // 4. Also update any existing PG tags (across ALL stores) that still have NULL name_en
    console.log('\nChecking for any remaining NULL name_en entries in recipe_tags...');
    const nullResult = await pgPool.query(
      'SELECT id, store_id, name FROM recipe_tags WHERE name_en IS NULL'
    );
    for (const row of nullResult.rows) {
      const translation = translateTag(row.name);
      if (translation) {
        await pgPool.query(
          'UPDATE recipe_tags SET name_en = $1 WHERE id = $2',
          [translation, row.id]
        );
        totalUpdated++;
        console.log(`  [UPDATE] id=${row.id} store=${row.store_id} tag="${row.name}" → "${translation}"`);
      }
    }
    if (nullResult.rows.length === 0) {
      console.log('  No remaining NULL entries found.');
    }

  } finally {
    await mongoClient.close();
    await pgPool.end();
  }

  console.log('\n══════════════════════════════════════');
  console.log(`Total tags ADDED:   ${totalAdded}`);
  console.log(`Total tags UPDATED: ${totalUpdated}`);
  console.log('══════════════════════════════════════');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
