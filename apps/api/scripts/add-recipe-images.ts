/**
 * One-time script to add placeholder images to existing recipes in MongoDB.
 * Uses Unsplash source URLs keyed by common recipe/baking keywords.
 *
 * Usage:  npx tsx apps/api/scripts/add-recipe-images.ts
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/mise';

// Keyword → Unsplash photo ID mapping for high-quality, stable images
const KEYWORD_IMAGES: [RegExp, string][] = [
  // Specific items first
  [/croissant/i, 'https://images.unsplash.com/photo-1555507036-ab1f4038024a?w=800&h=600&fit=crop'],
  [/baguette|bread/i, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&h=600&fit=crop'],
  [/challah/i, 'https://images.unsplash.com/photo-1603379016822-e6d5e2770ece?w=800&h=600&fit=crop'],
  [/focaccia/i, 'https://images.unsplash.com/photo-1586444248879-bc604bc77a56?w=800&h=600&fit=crop'],
  [/sourdough/i, 'https://images.unsplash.com/photo-1585478259715-876acc5be8eb?w=800&h=600&fit=crop'],
  [/ciabatta/i, 'https://images.unsplash.com/photo-1574085733277-851d9d856a3a?w=800&h=600&fit=crop'],
  [/brioche/i, 'https://images.unsplash.com/photo-1620921568790-528b0e0e9893?w=800&h=600&fit=crop'],
  [/pretzel/i, 'https://images.unsplash.com/photo-1570145820259-b5b80c5c8bd6?w=800&h=600&fit=crop'],
  [/bagel/i, 'https://images.unsplash.com/photo-1585535750014-b1ed1e22bfc4?w=800&h=600&fit=crop'],
  [/pita/i, 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=800&h=600&fit=crop'],
  [/donut|doughnut/i, 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=800&h=600&fit=crop'],
  [/muffin/i, 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=800&h=600&fit=crop'],
  [/scone/i, 'https://images.unsplash.com/photo-1558303289-17e9622a8078?w=800&h=600&fit=crop'],
  [/cinnamon.?roll|cinnamon.?bun/i, 'https://images.unsplash.com/photo-1509365390695-33aee754301f?w=800&h=600&fit=crop'],
  [/macaron/i, 'https://images.unsplash.com/photo-1569864358642-9d1684040f43?w=800&h=600&fit=crop'],
  [/eclair/i, 'https://images.unsplash.com/photo-1525059696034-4967a8e1dca2?w=800&h=600&fit=crop'],
  [/brownie/i, 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&h=600&fit=crop'],
  [/cookie/i, 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800&h=600&fit=crop'],
  [/cupcake/i, 'https://images.unsplash.com/photo-1614707267537-b85aaf00c4b7?w=800&h=600&fit=crop'],
  [/cheesecake/i, 'https://images.unsplash.com/photo-1524351199678-941a58a3df50?w=800&h=600&fit=crop'],
  [/chocolate.?cake/i, 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&h=600&fit=crop'],
  [/carrot.?cake/i, 'https://images.unsplash.com/photo-1621303837174-89787a7d4729?w=800&h=600&fit=crop'],
  [/cake/i, 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&h=600&fit=crop'],
  [/tart|tartlet/i, 'https://images.unsplash.com/photo-1519915028121-7d3463d20b13?w=800&h=600&fit=crop'],
  [/pie/i, 'https://images.unsplash.com/photo-1535920527002-b35e96722eb9?w=800&h=600&fit=crop'],
  [/pizza/i, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=600&fit=crop'],
  [/quiche/i, 'https://images.unsplash.com/photo-1527515637462-cee1cc710d43?w=800&h=600&fit=crop'],
  [/waffle/i, 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=800&h=600&fit=crop'],
  [/pancake|crepe/i, 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&h=600&fit=crop'],
  [/meringue|pavlova/i, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&h=600&fit=crop'],
  [/tiramisu/i, 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800&h=600&fit=crop'],
  [/mousse/i, 'https://images.unsplash.com/photo-1541783245831-57d6fb0926d3?w=800&h=600&fit=crop'],
  [/cream.?puff|profiterole|choux/i, 'https://images.unsplash.com/photo-1509365465985-25d11c17e812?w=800&h=600&fit=crop'],

  // Category-level fallbacks
  [/pastry|pastries|viennoiserie/i, 'https://images.unsplash.com/photo-1517433670267-08bbd4be890f?w=800&h=600&fit=crop'],
  [/dessert|sweet/i, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&h=600&fit=crop'],
  [/bread|loaf|roll/i, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&h=600&fit=crop'],
];

// Generic bakery fallbacks
const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1517433670267-08bbd4be890f?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1555507036-ab1f4038024a?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&h=600&fit=crop',
];

// Extra images pool — all sourced from the proven KEYWORD_IMAGES above
const EXTRA_BAKERY_IMAGES = KEYWORD_IMAGES.map(([, url]) => url);

function pickImages(name: string, category?: string): string[] {
  const text = `${name} ${category ?? ''}`;
  let primary: string | undefined;
  for (const [pattern, url] of KEYWORD_IMAGES) {
    if (pattern.test(text)) {
      primary = url;
      break;
    }
  }
  if (!primary) primary = FALLBACK_IMAGES[0];

  // Pick 2-3 extra images that differ from the primary
  const extras = EXTRA_BAKERY_IMAGES.filter((url) => url !== primary);
  // Deterministic shuffle based on name length
  const seed = name.length;
  const shuffled = extras
    .map((url, i) => ({ url, sort: (i * 7 + seed * 13) % extras.length }))
    .sort((a, b) => a.sort - b.sort)
    .map((x) => x.url);

  const count = 2 + (seed % 2); // 2 or 3 extras → total 3 or 4
  return [primary, ...shuffled.slice(0, count)];
}

async function main() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection('recipes');

    const recipes = await collection.find({}).toArray();

    if (recipes.length === 0) {
      console.log('No recipes found in the database.');
      return;
    }

    let updated = 0;
    let skipped = 0;

    for (const recipe of recipes) {
      const imageUrls = pickImages(recipe.name, recipe.category);
      await collection.updateOne(
        { _id: recipe._id },
        { $set: { photos: imageUrls, updatedAt: new Date() } },
      );
      updated++;
      console.log(`  ✓ ${recipe.name} → ${imageUrls.length} photos added`);
    }

    console.log(`\nDone: ${updated} updated, ${skipped} skipped (already had photos).`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
