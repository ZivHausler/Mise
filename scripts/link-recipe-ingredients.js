#!/usr/bin/env node
/**
 * Link recipe ingredients in MongoDB to inventory ingredient IDs in PostgreSQL
 * Processes ALL stores except 38 (already done).
 *
 * Matching strategy:
 * - Sort inventory ingredients by name length descending (longer names first)
 * - For each recipe ingredient name, check if any inventory name is a substring
 *   of it, or if the recipe ingredient name is a substring of the inventory name
 * - Set ingredientId on match
 */

const { MongoClient } = require('mongodb');
const { Client } = require('pg');

const PG_URI = 'postgresql://mise:mise@localhost:5432/mise';
const MONGO_URI = 'mongodb://localhost:27017/mise';
const SKIP_STORE = 38;

async function main() {
  const pg = new Client({ connectionString: PG_URI });
  await pg.connect();

  const mongo = new MongoClient(MONGO_URI);
  await mongo.connect();
  const db = mongo.db('mise');

  // Get all store IDs that have ingredients in PostgreSQL (except 38)
  const { rows: storeRows } = await pg.query(
    'SELECT DISTINCT store_id FROM ingredients WHERE store_id != $1 ORDER BY store_id',
    [SKIP_STORE]
  );
  const storeIds = storeRows.map(r => r.store_id);

  console.log(`\nProcessing ${storeIds.length} stores: ${storeIds.join(', ')}\n`);
  console.log('─'.repeat(70));

  const globalStats = { stores: 0, recipes: 0, linked: 0, alreadyLinked: 0, unmatched: 0 };
  const allUnmatched = [];

  for (const storeId of storeIds) {
    // Fetch inventory from PostgreSQL
    const { rows: inventory } = await pg.query(
      'SELECT id, name FROM ingredients WHERE store_id = $1',
      [storeId]
    );

    // Sort by name length descending (longer names match first)
    const sortedInventory = [...inventory].sort((a, b) => b.name.length - a.name.length);

    // Fetch recipes from MongoDB
    const recipes = await db.collection('recipes').find({ storeId }).toArray();

    let linkedCount = 0;
    let alreadyLinkedCount = 0;
    let unmatchedCount = 0;
    let totalIngredients = 0;
    const unmatchedNames = new Set();

    // Process each recipe
    for (const recipe of recipes) {
      if (!recipe.ingredients || recipe.ingredients.length === 0) continue;

      let recipeModified = false;

      for (const ingredient of recipe.ingredients) {
        totalIngredients++;

        // Already linked with a valid value — skip
        if (ingredient.ingredientId && ingredient.ingredientId !== null) {
          alreadyLinkedCount++;
          continue;
        }

        const recipeIngName = (ingredient.name || '').trim();
        if (!recipeIngName) {
          unmatchedCount++;
          continue;
        }

        // Try to find a match in inventory
        const match = sortedInventory.find(inv => {
          const invName = inv.name.trim();
          return (
            invName === recipeIngName ||
            recipeIngName.includes(invName) ||
            invName.includes(recipeIngName)
          );
        });

        if (match) {
          ingredient.ingredientId = String(match.id);
          recipeModified = true;
          linkedCount++;
        } else {
          unmatchedCount++;
          unmatchedNames.add(recipeIngName);
        }
      }

      if (recipeModified) {
        await db.collection('recipes').updateOne(
          { _id: recipe._id },
          { $set: { ingredients: recipe.ingredients, updatedAt: new Date() } }
        );
      }
    }

    // Per-store report
    const storeUnmatched = [...unmatchedNames];
    if (storeUnmatched.length > 0) {
      allUnmatched.push({ storeId, names: storeUnmatched });
    }

    const statusLine = unmatchedCount > 0 ? '⚠' : '✓';
    console.log(
      `${statusLine} Store ${String(storeId).padEnd(4)} | ` +
      `recipes: ${String(recipes.length).padStart(3)} | ` +
      `total ings: ${String(totalIngredients).padStart(4)} | ` +
      `already linked: ${String(alreadyLinkedCount).padStart(4)} | ` +
      `newly linked: ${String(linkedCount).padStart(3)} | ` +
      `unmatched: ${String(unmatchedCount).padStart(3)}`
    );

    if (storeUnmatched.length > 0) {
      storeUnmatched.forEach(n => console.log(`     Unmatched: "${n}"`));
    }

    globalStats.stores++;
    globalStats.recipes += recipes.length;
    globalStats.linked += linkedCount;
    globalStats.alreadyLinked += alreadyLinkedCount;
    globalStats.unmatched += unmatchedCount;
  }

  console.log('─'.repeat(70));
  console.log('\nGlobal summary:');
  console.log(`  Stores processed : ${globalStats.stores}`);
  console.log(`  Recipes processed: ${globalStats.recipes}`);
  console.log(`  Already linked   : ${globalStats.alreadyLinked}`);
  console.log(`  Newly linked     : ${globalStats.linked}`);
  console.log(`  Unmatched        : ${globalStats.unmatched}`);

  await pg.end();
  await mongo.close();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
