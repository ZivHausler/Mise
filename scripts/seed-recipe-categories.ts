/**
 * Seed recipe categories for each store and assign recipes to categories.
 * Also creates new recipes to fill out each category.
 */

import { MongoClient, ObjectId } from 'mongodb';
import pg from 'pg';

const PG_URL = 'postgresql://mise:mise@localhost:5432/mise';
const MONGO_URL = 'mongodb://localhost:27017/mise';

interface NewRecipe {
  name: string;
  description: string;
  category: string;
  ingredients: { ingredientId: string; name: string; quantity: number; unit: string; costPerUnit: number }[];
  steps: { order: number; type: 'step'; instruction: string; duration: number }[];
  yield: number;
  yieldUnit: string;
  sellingPrice: number;
  tags: string[];
  notes?: string;
}

// ─── Store 1: Dian's (English/French pastry shop) ───
const STORE_1_NEW: NewRecipe[] = [
  // Cakes
  { name: 'Red Velvet Cake', description: 'Classic red velvet with cream cheese frosting.', category: 'Cakes', ingredients: [{ ingredientId: '108', name: 'All-Purpose Flour', quantity: 300, unit: 'g', costPerUnit: 8 }, { ingredientId: '115', name: 'Sugar', quantity: 250, unit: 'g', costPerUnit: 5 }, { ingredientId: '122', name: 'Eggs', quantity: 3, unit: 'pcs', costPerUnit: 1.2 }, { ingredientId: '111', name: 'Butter', quantity: 120, unit: 'g', costPerUnit: 42 }], steps: [{ order: 1, type: 'step', instruction: 'Preheat oven to 175°C. Line two 20cm round pans.', duration: 5 }, { order: 2, type: 'step', instruction: 'Cream butter and sugar, add eggs one at a time.', duration: 8 }, { order: 3, type: 'step', instruction: 'Mix dry ingredients separately. Fold in alternating with buttermilk.', duration: 5 }, { order: 4, type: 'step', instruction: 'Divide between pans and bake 25-30 minutes.', duration: 28 }, { order: 5, type: 'step', instruction: 'Cool completely and frost with cream cheese frosting.', duration: 20 }], yield: 12, yieldUnit: 'slices', sellingPrice: 140, tags: ['Cakes', 'Classic', 'Dairy'] },
  { name: 'Lemon Drizzle Cake', description: 'Moist lemon sponge with tangy glaze.', category: 'Cakes', ingredients: [{ ingredientId: '108', name: 'All-Purpose Flour', quantity: 225, unit: 'g', costPerUnit: 8 }, { ingredientId: '115', name: 'Sugar', quantity: 225, unit: 'g', costPerUnit: 5 }, { ingredientId: '111', name: 'Butter', quantity: 225, unit: 'g', costPerUnit: 42 }, { ingredientId: '122', name: 'Eggs', quantity: 4, unit: 'pcs', costPerUnit: 1.2 }], steps: [{ order: 1, type: 'step', instruction: 'Preheat oven to 180°C. Grease loaf tin.', duration: 5 }, { order: 2, type: 'step', instruction: 'Beat butter, sugar, eggs and flour until smooth. Add lemon zest.', duration: 8 }, { order: 3, type: 'step', instruction: 'Bake for 45-50 minutes until golden.', duration: 48 }, { order: 4, type: 'step', instruction: 'Mix lemon juice with sugar, poke holes and pour over warm cake.', duration: 5 }], yield: 10, yieldUnit: 'slices', sellingPrice: 95, tags: ['Cakes', 'Citrus', 'Classic'] },
  { name: 'Carrot Walnut Cake', description: 'Spiced carrot cake with toasted walnuts and cream cheese frosting.', category: 'Cakes', ingredients: [{ ingredientId: '108', name: 'All-Purpose Flour', quantity: 250, unit: 'g', costPerUnit: 8 }, { ingredientId: '122', name: 'Eggs', quantity: 3, unit: 'pcs', costPerUnit: 1.2 }, { ingredientId: '115', name: 'Sugar', quantity: 200, unit: 'g', costPerUnit: 5 }], steps: [{ order: 1, type: 'step', instruction: 'Preheat oven to 170°C. Grate carrots, toast walnuts.', duration: 10 }, { order: 2, type: 'step', instruction: 'Mix wet and dry ingredients separately, then combine.', duration: 8 }, { order: 3, type: 'step', instruction: 'Fold in carrots and walnuts. Bake 35-40 minutes.', duration: 38 }, { order: 4, type: 'step', instruction: 'Cool and frost with cream cheese frosting.', duration: 15 }], yield: 14, yieldUnit: 'slices', sellingPrice: 130, tags: ['Cakes', 'Nuts', 'Classic'] },
  // Pastries
  { name: 'Almond Croissants', description: 'Butter croissants filled with frangipane and topped with sliced almonds.', category: 'Pastries', ingredients: [{ ingredientId: '108', name: 'All-Purpose Flour', quantity: 500, unit: 'g', costPerUnit: 8 }, { ingredientId: '111', name: 'Butter', quantity: 300, unit: 'g', costPerUnit: 42 }, { ingredientId: '115', name: 'Sugar', quantity: 100, unit: 'g', costPerUnit: 5 }], steps: [{ order: 1, type: 'step', instruction: 'Prepare laminated dough with butter folds. Chill between folds.', duration: 120 }, { order: 2, type: 'step', instruction: 'Make frangipane filling with almond flour, butter and sugar.', duration: 10 }, { order: 3, type: 'step', instruction: 'Roll, cut, fill and shape croissants. Proof 1 hour.', duration: 80 }, { order: 4, type: 'step', instruction: 'Brush with egg wash, top with almonds. Bake at 190°C for 18 minutes.', duration: 18 }], yield: 12, yieldUnit: 'pieces', sellingPrice: 18, tags: ['Pastries', 'French', 'Nuts', 'Premium'] },
  { name: 'Apple Strudel', description: 'Thin, flaky pastry filled with spiced apples and raisins.', category: 'Pastries', ingredients: [{ ingredientId: '108', name: 'All-Purpose Flour', quantity: 250, unit: 'g', costPerUnit: 8 }, { ingredientId: '111', name: 'Butter', quantity: 80, unit: 'g', costPerUnit: 42 }, { ingredientId: '115', name: 'Sugar', quantity: 100, unit: 'g', costPerUnit: 5 }], steps: [{ order: 1, type: 'step', instruction: 'Make strudel dough, stretch paper-thin on floured cloth.', duration: 40 }, { order: 2, type: 'step', instruction: 'Toss sliced apples with cinnamon, sugar and raisins.', duration: 10 }, { order: 3, type: 'step', instruction: 'Spread filling, roll tightly, brush with melted butter.', duration: 10 }, { order: 4, type: 'step', instruction: 'Bake at 180°C for 35-40 minutes until golden and crispy.', duration: 38 }], yield: 8, yieldUnit: 'slices', sellingPrice: 110, tags: ['Pastries', 'Classic', 'Seasonal'] },
  // Desserts
  { name: 'Crème Brûlée', description: 'Classic French vanilla custard with caramelized sugar top.', category: 'Desserts', ingredients: [{ ingredientId: '122', name: 'Eggs', quantity: 6, unit: 'pcs', costPerUnit: 1.2 }, { ingredientId: '115', name: 'Sugar', quantity: 100, unit: 'g', costPerUnit: 5 }, { ingredientId: '123', name: 'Vanilla Extract', quantity: 10, unit: 'ml', costPerUnit: 0.3 }], steps: [{ order: 1, type: 'step', instruction: 'Heat cream with vanilla to a simmer.', duration: 8 }, { order: 2, type: 'step', instruction: 'Whisk yolks with sugar. Temper with hot cream.', duration: 5 }, { order: 3, type: 'step', instruction: 'Strain into ramekins. Bake in water bath at 150°C for 45 minutes.', duration: 50 }, { order: 4, type: 'step', instruction: 'Chill overnight. Torch sugar before serving.', duration: 5 }], yield: 6, yieldUnit: 'pieces', sellingPrice: 32, tags: ['Desserts', 'French', 'Premium', 'Gluten-Free'] },
  { name: 'Tiramisu', description: 'Italian layered dessert with mascarpone, espresso and cocoa.', category: 'Desserts', ingredients: [{ ingredientId: '122', name: 'Eggs', quantity: 4, unit: 'pcs', costPerUnit: 1.2 }, { ingredientId: '115', name: 'Sugar', quantity: 100, unit: 'g', costPerUnit: 5 }, { ingredientId: '128', name: 'Cocoa Powder', quantity: 20, unit: 'g', costPerUnit: 38 }], steps: [{ order: 1, type: 'step', instruction: 'Separate eggs. Beat yolks with sugar until pale.', duration: 5 }, { order: 2, type: 'step', instruction: 'Fold in mascarpone. Whip whites and fold in gently.', duration: 8 }, { order: 3, type: 'step', instruction: 'Dip ladyfingers in espresso, layer with cream.', duration: 10 }, { order: 4, type: 'step', instruction: 'Refrigerate 6+ hours. Dust with cocoa before serving.', duration: 5 }], yield: 8, yieldUnit: 'portions', sellingPrice: 38, tags: ['Desserts', 'Premium', 'Dairy'] },
  { name: 'Panna Cotta', description: 'Silky Italian vanilla cream dessert with berry coulis.', category: 'Desserts', ingredients: [{ ingredientId: '115', name: 'Sugar', quantity: 80, unit: 'g', costPerUnit: 5 }, { ingredientId: '123', name: 'Vanilla Extract', quantity: 10, unit: 'ml', costPerUnit: 0.3 }], steps: [{ order: 1, type: 'step', instruction: 'Bloom gelatin in cold water.', duration: 5 }, { order: 2, type: 'step', instruction: 'Heat cream with sugar and vanilla. Dissolve gelatin in.', duration: 8 }, { order: 3, type: 'step', instruction: 'Pour into molds, chill 4+ hours until set.', duration: 5 }, { order: 4, type: 'step', instruction: 'Make berry coulis by simmering berries with sugar.', duration: 10 }], yield: 6, yieldUnit: 'pieces', sellingPrice: 28, tags: ['Desserts', 'Gluten-Free', 'Premium'] },
  // Fillings
  { name: 'Lemon Curd', description: 'Bright, tangy lemon curd for tarts and layer cakes.', category: 'Fillings', ingredients: [{ ingredientId: '122', name: 'Eggs', quantity: 4, unit: 'pcs', costPerUnit: 1.2 }, { ingredientId: '115', name: 'Sugar', quantity: 150, unit: 'g', costPerUnit: 5 }, { ingredientId: '111', name: 'Butter', quantity: 100, unit: 'g', costPerUnit: 42 }], steps: [{ order: 1, type: 'step', instruction: 'Whisk eggs, sugar and lemon juice over double boiler.', duration: 10 }, { order: 2, type: 'step', instruction: 'Stir constantly until thickened (75°C).', duration: 8 }, { order: 3, type: 'step', instruction: 'Remove from heat, stir in butter. Strain through sieve.', duration: 5 }], yield: 500, yieldUnit: 'ml', sellingPrice: 0, tags: ['Fillings', 'Citrus'] },
  { name: 'Swiss Meringue Buttercream', description: 'Silky, stable buttercream for frosting cakes and cupcakes.', category: 'Fillings', ingredients: [{ ingredientId: '122', name: 'Eggs', quantity: 5, unit: 'pcs', costPerUnit: 1.2 }, { ingredientId: '115', name: 'Sugar', quantity: 250, unit: 'g', costPerUnit: 5 }, { ingredientId: '111', name: 'Butter', quantity: 450, unit: 'g', costPerUnit: 42 }], steps: [{ order: 1, type: 'step', instruction: 'Whisk egg whites and sugar over double boiler until 70°C.', duration: 8 }, { order: 2, type: 'step', instruction: 'Transfer to mixer, whip on high until stiff and cool.', duration: 12 }, { order: 3, type: 'step', instruction: 'Add butter one tablespoon at a time, whipping between each addition.', duration: 10 }, { order: 4, type: 'step', instruction: 'Add vanilla and any desired flavoring.', duration: 2 }], yield: 800, yieldUnit: 'g', sellingPrice: 0, tags: ['Fillings', 'Classic'] },
  // NEW: Cookies
  { name: 'Double Chocolate Chip Cookies', description: 'Rich, chewy cookies loaded with dark and white chocolate chips.', category: 'Cookies', ingredients: [{ ingredientId: '108', name: 'All-Purpose Flour', quantity: 280, unit: 'g', costPerUnit: 8 }, { ingredientId: '111', name: 'Butter', quantity: 170, unit: 'g', costPerUnit: 42 }, { ingredientId: '115', name: 'Sugar', quantity: 200, unit: 'g', costPerUnit: 5 }, { ingredientId: '122', name: 'Eggs', quantity: 2, unit: 'pcs', costPerUnit: 1.2 }], steps: [{ order: 1, type: 'step', instruction: 'Cream butter with sugars until fluffy. Add eggs and vanilla.', duration: 8 }, { order: 2, type: 'step', instruction: 'Mix in flour, cocoa, baking soda and salt.', duration: 5 }, { order: 3, type: 'step', instruction: 'Fold in chocolate chips. Scoop onto lined baking sheets.', duration: 10 }, { order: 4, type: 'step', instruction: 'Bake at 175°C for 10-12 minutes. Cool on pan.', duration: 12 }], yield: 24, yieldUnit: 'cookies', sellingPrice: 8, tags: ['Cookies', 'Chocolate'] },
  { name: 'Butter Shortbread', description: 'Crumbly, buttery Scottish-style shortbread fingers.', category: 'Cookies', ingredients: [{ ingredientId: '108', name: 'All-Purpose Flour', quantity: 300, unit: 'g', costPerUnit: 8 }, { ingredientId: '111', name: 'Butter', quantity: 200, unit: 'g', costPerUnit: 42 }, { ingredientId: '115', name: 'Sugar', quantity: 100, unit: 'g', costPerUnit: 5 }], steps: [{ order: 1, type: 'step', instruction: 'Beat butter and sugar until pale. Mix in flour and salt.', duration: 8 }, { order: 2, type: 'step', instruction: 'Press into lined pan, prick with fork. Chill 30 minutes.', duration: 35 }, { order: 3, type: 'step', instruction: 'Bake at 160°C for 25-30 minutes until light golden.', duration: 28 }, { order: 4, type: 'step', instruction: 'Cut while warm. Cool completely and dust with sugar.', duration: 5 }], yield: 20, yieldUnit: 'fingers', sellingPrice: 6, tags: ['Cookies', 'Classic'] },
  { name: 'Tahini Cookies', description: 'Nutty, chewy cookies with tahini and sesame seeds.', category: 'Cookies', ingredients: [{ ingredientId: '108', name: 'All-Purpose Flour', quantity: 200, unit: 'g', costPerUnit: 8 }, { ingredientId: '115', name: 'Sugar', quantity: 150, unit: 'g', costPerUnit: 5 }, { ingredientId: '122', name: 'Eggs', quantity: 1, unit: 'pcs', costPerUnit: 1.2 }], steps: [{ order: 1, type: 'step', instruction: 'Mix tahini, sugar and egg until smooth.', duration: 5 }, { order: 2, type: 'step', instruction: 'Add flour, baking powder and salt. Form into balls.', duration: 8 }, { order: 3, type: 'step', instruction: 'Roll in sesame seeds, flatten slightly.', duration: 5 }, { order: 4, type: 'step', instruction: 'Bake at 170°C for 12-14 minutes.', duration: 13 }], yield: 20, yieldUnit: 'cookies', sellingPrice: 7, tags: ['Cookies', 'Pareve'] },
  // NEW: Breads
  { name: 'Challah', description: 'Traditional braided egg bread, perfect for Shabbat.', category: 'Breads', ingredients: [{ ingredientId: '108', name: 'All-Purpose Flour', quantity: 500, unit: 'g', costPerUnit: 8 }, { ingredientId: '122', name: 'Eggs', quantity: 3, unit: 'pcs', costPerUnit: 1.2 }, { ingredientId: '115', name: 'Sugar', quantity: 80, unit: 'g', costPerUnit: 5 }], steps: [{ order: 1, type: 'step', instruction: 'Activate yeast with warm water and sugar.', duration: 10 }, { order: 2, type: 'step', instruction: 'Mix flour, eggs, oil, salt. Knead 10 minutes until smooth.', duration: 12 }, { order: 3, type: 'step', instruction: 'Rise 1 hour until doubled.', duration: 60 }, { order: 4, type: 'step', instruction: 'Divide into strands, braid. Proof 30 minutes.', duration: 35 }, { order: 5, type: 'step', instruction: 'Egg wash and bake at 180°C for 30 minutes.', duration: 30 }], yield: 1, yieldUnit: 'loaf', sellingPrice: 35, tags: ['Breads', 'Classic', 'Pareve'] },
  { name: 'Focaccia', description: 'Italian olive oil flatbread with rosemary and sea salt.', category: 'Breads', ingredients: [{ ingredientId: '108', name: 'All-Purpose Flour', quantity: 500, unit: 'g', costPerUnit: 8 }, { ingredientId: '125', name: 'Salt', quantity: 10, unit: 'g', costPerUnit: 3 }], steps: [{ order: 1, type: 'step', instruction: 'Mix flour, yeast, salt, water and olive oil. Knead briefly.', duration: 10 }, { order: 2, type: 'step', instruction: 'First rise for 1 hour.', duration: 60 }, { order: 3, type: 'step', instruction: 'Stretch into oiled pan. Dimple with fingers, drizzle olive oil.', duration: 10 }, { order: 4, type: 'step', instruction: 'Top with rosemary and sea salt. Second rise 30 minutes.', duration: 30 }, { order: 5, type: 'step', instruction: 'Bake at 220°C for 20-25 minutes until golden.', duration: 22 }], yield: 1, yieldUnit: 'loaf', sellingPrice: 30, tags: ['Breads', 'Italian'] },
  { name: 'Brioche Loaf', description: 'Rich, buttery French bread perfect for toast or French toast.', category: 'Breads', ingredients: [{ ingredientId: '108', name: 'All-Purpose Flour', quantity: 400, unit: 'g', costPerUnit: 8 }, { ingredientId: '111', name: 'Butter', quantity: 200, unit: 'g', costPerUnit: 42 }, { ingredientId: '122', name: 'Eggs', quantity: 5, unit: 'pcs', costPerUnit: 1.2 }], steps: [{ order: 1, type: 'step', instruction: 'Mix flour, sugar, yeast, salt and eggs. Knead until smooth.', duration: 15 }, { order: 2, type: 'step', instruction: 'Gradually add softened butter, knead until incorporated.', duration: 10 }, { order: 3, type: 'step', instruction: 'Chill dough overnight.', duration: 5 }, { order: 4, type: 'step', instruction: 'Shape, place in loaf pan. Proof 1.5 hours.', duration: 90 }, { order: 5, type: 'step', instruction: 'Egg wash and bake at 175°C for 30-35 minutes.', duration: 33 }], yield: 1, yieldUnit: 'loaf', sellingPrice: 45, tags: ['Breads', 'French', 'Dairy', 'Premium'] },
];

// ─── Store 6: Test (Hebrew bakery) ───
const STORE_6_NEW: NewRecipe[] = [
  // עוגות
  { name: 'עוגת מוס שוקולד לבן', description: 'עוגת מוס קלילה ועדינה על בסיס שוקולד לבן בלגי עם רוטב פירות יער.', category: 'עוגות', ingredients: [{ ingredientId: '127', name: 'שוקולד לבן', quantity: 300, unit: 'g', costPerUnit: 52 }, { ingredientId: '122', name: 'ביצים', quantity: 4, unit: 'pcs', costPerUnit: 1.2 }, { ingredientId: '115', name: 'סוכר', quantity: 80, unit: 'g', costPerUnit: 5 }], steps: [{ order: 1, type: 'step', instruction: 'להכין בסיס ביסקוויט ולצנן.', duration: 25 }, { order: 2, type: 'step', instruction: 'להמיס שוקולד לבן, לערבב עם שמנת מוקצפת.', duration: 10 }, { order: 3, type: 'step', instruction: 'לשפוך על הבסיס ולהקפיא 4 שעות.', duration: 5 }], yield: 10, yieldUnit: 'מנות', sellingPrice: 135, tags: ['עוגות', 'חלבי', 'פרמיום'] },
  { name: 'עוגת לוטוס', description: 'עוגת שכבות עם ממרח לוטוס, קרם גבינה וציפוי מבריק.', category: 'עוגות', ingredients: [{ ingredientId: '108', name: 'קמח', quantity: 250, unit: 'g', costPerUnit: 8 }, { ingredientId: '111', name: 'חמאה', quantity: 150, unit: 'g', costPerUnit: 42 }, { ingredientId: '122', name: 'ביצים', quantity: 3, unit: 'pcs', costPerUnit: 1.2 }], steps: [{ order: 1, type: 'step', instruction: 'להכין בלילה עם ממרח לוטוס ולאפות שתי שכבות.', duration: 35 }, { order: 2, type: 'step', instruction: 'להכין קרם גבינה עם לוטוס.', duration: 10 }, { order: 3, type: 'step', instruction: 'להרכיב, לצנן ולקשט בעוגיות לוטוס.', duration: 15 }], yield: 12, yieldUnit: 'מנות', sellingPrice: 145, tags: ['עוגות', 'חלבי', 'פרמיום'] },
  // מאפים
  { name: 'שמרים במילוי שוקולד', description: 'מאפה שמרים רך ואוורירי עם מילוי שוקולד עשיר.', category: 'מאפים', ingredients: [{ ingredientId: '108', name: 'קמח', quantity: 500, unit: 'g', costPerUnit: 8 }, { ingredientId: '127', name: 'שוקולד', quantity: 200, unit: 'g', costPerUnit: 48 }, { ingredientId: '122', name: 'ביצים', quantity: 2, unit: 'pcs', costPerUnit: 1.2 }], steps: [{ order: 1, type: 'step', instruction: 'ללוש בצק שמרים ולתפיח שעה.', duration: 70 }, { order: 2, type: 'step', instruction: 'לרדד, למלא שוקולד, לגלגל ולחתוך.', duration: 15 }, { order: 3, type: 'step', instruction: 'תפיחה שנייה 30 דקות. לאפות ב-180 מעלות 20 דקות.', duration: 50 }], yield: 12, yieldUnit: 'יחידות', sellingPrice: 12, tags: ['מאפים', 'חלבי'] },
  { name: 'סמבוסק גבינה', description: 'סמבוסק פריך במילוי גבינות עם עשבי תיבול.', category: 'מאפים', ingredients: [{ ingredientId: '108', name: 'קמח', quantity: 400, unit: 'g', costPerUnit: 8 }, { ingredientId: '111', name: 'חמאה', quantity: 100, unit: 'g', costPerUnit: 42 }], steps: [{ order: 1, type: 'step', instruction: 'להכין בצק פריך עם חמאה וקמח.', duration: 15 }, { order: 2, type: 'step', instruction: 'להכין מילוי גבינות עם עשבי תיבול.', duration: 10 }, { order: 3, type: 'step', instruction: 'לרדד, לחתוך עיגולים, למלא ולסגור. לאפות ב-190 מעלות.', duration: 25 }], yield: 20, yieldUnit: 'יחידות', sellingPrice: 8, tags: ['מאפים', 'חלבי'] },
  { name: 'בורקס תפוחי אדמה', description: 'בורקס בצק עלים במילוי פירה תפוחי אדמה עשיר.', category: 'מאפים', ingredients: [{ ingredientId: '108', name: 'קמח', quantity: 300, unit: 'g', costPerUnit: 8 }, { ingredientId: '111', name: 'חמאה', quantity: 150, unit: 'g', costPerUnit: 42 }], steps: [{ order: 1, type: 'step', instruction: 'להכין פירה עם חמאה וביצים.', duration: 20 }, { order: 2, type: 'step', instruction: 'לרדד בצק עלים, למלא ולקפל.', duration: 15 }, { order: 3, type: 'step', instruction: 'למרוח ביצה ושומשום. לאפות ב-200 מעלות 25 דקות.', duration: 25 }], yield: 12, yieldUnit: 'יחידות', sellingPrice: 10, tags: ['מאפים', 'חלבי'] },
  // לחמים
  { name: 'לחם שיפון', description: 'לחם שיפון כהה וארומטי עם גרעיני חמנייה.', category: 'לחמים', ingredients: [{ ingredientId: '108', name: 'קמח שיפון', quantity: 300, unit: 'g', costPerUnit: 12 }, { ingredientId: '125', name: 'מלח', quantity: 10, unit: 'g', costPerUnit: 3 }], steps: [{ order: 1, type: 'step', instruction: 'לערבב קמח שיפון, קמח לבן, שמרים ומלח.', duration: 10 }, { order: 2, type: 'step', instruction: 'ללוש 10 דקות, לתפיח שעתיים.', duration: 130 }, { order: 3, type: 'step', instruction: 'לעצב כיכר, לתפיח שוב ולאפות ב-220 מעלות 35 דקות.', duration: 50 }], yield: 1, yieldUnit: 'כיכר', sellingPrice: 28, tags: ['לחמים', 'פרווה'] },
  { name: 'פיתות', description: 'פיתות ביתיות רכות ואווריריות.', category: 'לחמים', ingredients: [{ ingredientId: '108', name: 'קמח', quantity: 400, unit: 'g', costPerUnit: 8 }, { ingredientId: '125', name: 'מלח', quantity: 8, unit: 'g', costPerUnit: 3 }], steps: [{ order: 1, type: 'step', instruction: 'ללוש בצק עם קמח, מים, שמן, שמרים ומלח.', duration: 12 }, { order: 2, type: 'step', instruction: 'לתפיח שעה. לחלק לכדורים ולרדד.', duration: 70 }, { order: 3, type: 'step', instruction: 'לאפות בתנור מקסימלי 3-4 דקות לכל פיתה.', duration: 20 }], yield: 8, yieldUnit: 'יחידות', sellingPrice: 5, tags: ['לחמים', 'פרווה'] },
  // עוגיות
  { name: 'עוגיות חמאת בוטנים', description: 'עוגיות חמאת בוטנים פריכות מבחוץ ורכות מבפנים.', category: 'עוגיות', ingredients: [{ ingredientId: '108', name: 'קמח', quantity: 200, unit: 'g', costPerUnit: 8 }, { ingredientId: '115', name: 'סוכר', quantity: 150, unit: 'g', costPerUnit: 5 }, { ingredientId: '122', name: 'ביצים', quantity: 1, unit: 'pcs', costPerUnit: 1.2 }], steps: [{ order: 1, type: 'step', instruction: 'לערבב חמאת בוטנים, סוכר וביצה.', duration: 5 }, { order: 2, type: 'step', instruction: 'להוסיף קמח ואבקת אפייה. לגלגל כדורים.', duration: 8 }, { order: 3, type: 'step', instruction: 'לשטח במזלג ולאפות ב-170 מעלות 12 דקות.', duration: 12 }], yield: 24, yieldUnit: 'עוגיות', sellingPrice: 6, tags: ['עוגיות', 'פרווה'] },
  { name: 'מקרון צרפתי', description: 'מקרונים צבעוניים ועדינים עם מילוי גנאש.', category: 'עוגיות', ingredients: [{ ingredientId: '115', name: 'סוכר', quantity: 200, unit: 'g', costPerUnit: 5 }, { ingredientId: '122', name: 'ביצים', quantity: 3, unit: 'pcs', costPerUnit: 1.2 }], steps: [{ order: 1, type: 'step', instruction: 'להכין מרנג צרפתי עם חלבוני ביצים וסוכר.', duration: 12 }, { order: 2, type: 'step', instruction: 'לקפל קמח שקדים בעדינות (מקרונאז\').', duration: 8 }, { order: 3, type: 'step', instruction: 'לזרום על תבנית ולהניח 30 דקות. לאפות ב-150 מעלות 14 דקות.', duration: 45 }, { order: 4, type: 'step', instruction: 'למלא בגנאש או ריבה ולהצמיד זוגות.', duration: 10 }], yield: 20, yieldUnit: 'זוגות', sellingPrice: 10, tags: ['עוגיות', 'צרפתי', 'פרמיום'] },
  // NEW: קינוחים
  { name: 'פנה קוטה וניל', description: 'קינוח איטלקי קלאסי - פנה קוטה עם רוטב פירות יער.', category: 'קינוחים', ingredients: [{ ingredientId: '115', name: 'סוכר', quantity: 80, unit: 'g', costPerUnit: 5 }, { ingredientId: '123', name: 'תמצית וניל', quantity: 10, unit: 'ml', costPerUnit: 0.3 }], steps: [{ order: 1, type: 'step', instruction: 'להשרות ג\'לטין במים קרים.', duration: 5 }, { order: 2, type: 'step', instruction: 'לחמם שמנת עם סוכר ווניל. להמיס את הג\'לטין.', duration: 8 }, { order: 3, type: 'step', instruction: 'לשפוך לכוסות ולצנן 4 שעות.', duration: 5 }], yield: 6, yieldUnit: 'כוסות', sellingPrice: 28, tags: ['קינוחים', 'חלבי', 'ללא גלוטן'] },
  { name: 'סופלה שוקולד', description: 'סופלה שוקולד חמה עם לב נוזלי - מוגשת ישר מהתנור.', category: 'קינוחים', ingredients: [{ ingredientId: '127', name: 'שוקולד מריר', quantity: 200, unit: 'g', costPerUnit: 48 }, { ingredientId: '122', name: 'ביצים', quantity: 4, unit: 'pcs', costPerUnit: 1.2 }, { ingredientId: '111', name: 'חמאה', quantity: 80, unit: 'g', costPerUnit: 42 }], steps: [{ order: 1, type: 'step', instruction: 'להמיס שוקולד עם חמאה.', duration: 5 }, { order: 2, type: 'step', instruction: 'להקציף חלבונים עם סוכר.', duration: 8 }, { order: 3, type: 'step', instruction: 'לקפל חלבונים לשוקולד ולשפוך לרמקינים משומנים.', duration: 5 }, { order: 4, type: 'step', instruction: 'לאפות ב-200 מעלות 12-14 דקות. להגיש מיד.', duration: 13 }], yield: 6, yieldUnit: 'מנות', sellingPrice: 35, tags: ['קינוחים', 'חלבי', 'פרמיום'] },
  { name: 'קרם ברולה', description: 'קרם ברולה קלאסי עם שכבת סוכר מקורמלת.', category: 'קינוחים', ingredients: [{ ingredientId: '122', name: 'ביצים', quantity: 6, unit: 'pcs', costPerUnit: 1.2 }, { ingredientId: '115', name: 'סוכר', quantity: 100, unit: 'g', costPerUnit: 5 }], steps: [{ order: 1, type: 'step', instruction: 'לחמם שמנת עם וניל.', duration: 8 }, { order: 2, type: 'step', instruction: 'לטרוף חלמונים עם סוכר, לערבב עם שמנת.', duration: 5 }, { order: 3, type: 'step', instruction: 'לאפות באמבט מים ב-150 מעלות 45 דקות.', duration: 50 }, { order: 4, type: 'step', instruction: 'לצנן, לפזר סוכר ולצרוב לפני הגשה.', duration: 5 }], yield: 6, yieldUnit: 'מנות', sellingPrice: 32, tags: ['קינוחים', 'צרפתי', 'חלבי'] },
];

// ─── Store 34: Le Petit Four (French bakery) ───
const STORE_34_NEW: NewRecipe[] = [
  // מאפים
  { name: 'קרואסון שוקולד', description: 'קרואסון חמאה במילוי מקלות שוקולד בלגי.', category: 'מאפים', ingredients: [{ ingredientId: '108', name: 'קמח', quantity: 500, unit: 'g', costPerUnit: 8 }, { ingredientId: '111', name: 'חמאה', quantity: 280, unit: 'g', costPerUnit: 42 }], steps: [{ order: 1, type: 'step', instruction: 'להכין בצק למינציה עם קיפולי חמאה.', duration: 120 }, { order: 2, type: 'step', instruction: 'לרדד, לחתוך מלבנים ולהניח מקלות שוקולד.', duration: 15 }, { order: 3, type: 'step', instruction: 'לגלגל ולתפיח שעה. לאפות ב-190 מעלות 18 דקות.', duration: 78 }], yield: 12, yieldUnit: 'יחידות', sellingPrice: 16, tags: ['מאפים', 'צרפתי', 'שוקולד'] },
  { name: 'קיש לורן', description: 'קיש צרפתי קלאסי עם בייקון, גבינה ובצל.', category: 'מאפים', ingredients: [{ ingredientId: '108', name: 'קמח', quantity: 250, unit: 'g', costPerUnit: 8 }, { ingredientId: '111', name: 'חמאה', quantity: 125, unit: 'g', costPerUnit: 42 }, { ingredientId: '122', name: 'ביצים', quantity: 4, unit: 'pcs', costPerUnit: 1.2 }], steps: [{ order: 1, type: 'step', instruction: 'להכין בצק פריך ולצנן 30 דקות.', duration: 40 }, { order: 2, type: 'step', instruction: 'לרדד לתבנית, לאפות עיוור 15 דקות.', duration: 20 }, { order: 3, type: 'step', instruction: 'להכין מילוי ביצים ושמנת, לשפוך ולאפות 30 דקות.', duration: 35 }], yield: 8, yieldUnit: 'מנות', sellingPrice: 45, tags: ['מאפים', 'צרפתי', 'חלבי'] },
  // לחמים
  { name: 'לחם כפרי', description: 'לחם כפרי עם קרום פריך ופנים רך ואוורירי.', category: 'לחמים', ingredients: [{ ingredientId: '108', name: 'קמח', quantity: 500, unit: 'g', costPerUnit: 8 }, { ingredientId: '125', name: 'מלח', quantity: 10, unit: 'g', costPerUnit: 3 }], steps: [{ order: 1, type: 'step', instruction: 'לערבב קמח, מים, שמרים ומלח. ללוש 10 דקות.', duration: 12 }, { order: 2, type: 'step', instruction: 'תפיחה ראשונה שעתיים עם קיפולים כל 30 דקות.', duration: 120 }, { order: 3, type: 'step', instruction: 'לעצב, לתפיח ולאפות בסיר ברזל ב-240 מעלות.', duration: 50 }], yield: 1, yieldUnit: 'כיכר', sellingPrice: 32, tags: ['לחמים', 'צרפתי'] },
  { name: 'לחם זיתים ורוזמרין', description: 'לחם ארטיזנלי עם זיתי קלמטה ורוזמרין טרי.', category: 'לחמים', ingredients: [{ ingredientId: '108', name: 'קמח', quantity: 450, unit: 'g', costPerUnit: 8 }, { ingredientId: '125', name: 'מלח', quantity: 8, unit: 'g', costPerUnit: 3 }], steps: [{ order: 1, type: 'step', instruction: 'ללוש בצק בסיסי, לקפל זיתים ורוזמרין.', duration: 15 }, { order: 2, type: 'step', instruction: 'תפיחה ארוכה - 3 שעות.', duration: 180 }, { order: 3, type: 'step', instruction: 'לעצב, לתפיח ולאפות ב-230 מעלות 30 דקות.', duration: 45 }], yield: 1, yieldUnit: 'כיכר', sellingPrice: 38, tags: ['לחמים', 'ים תיכוני'] },
  // קינוחים
  { name: 'מילפיי', description: 'מילפיי קלאסי - שכבות בצק עלים עם קרם פטיסייר ופירות.', category: 'קינוחים', ingredients: [{ ingredientId: '108', name: 'קמח', quantity: 300, unit: 'g', costPerUnit: 8 }, { ingredientId: '111', name: 'חמאה', quantity: 200, unit: 'g', costPerUnit: 42 }], steps: [{ order: 1, type: 'step', instruction: 'להכין בצק עלים עם קיפולי חמאה. לצנן.', duration: 120 }, { order: 2, type: 'step', instruction: 'לרדד ולאפות בין שתי תבניות ב-200 מעלות.', duration: 25 }, { order: 3, type: 'step', instruction: 'להכין קרם פטיסייר ולהרכיב שכבות.', duration: 20 }], yield: 8, yieldUnit: 'מנות', sellingPrice: 38, tags: ['קינוחים', 'צרפתי', 'פרמיום'] },
  { name: 'מקרון צרפתי', description: 'מקרונים צבעוניים עם מילוי גנאש במגוון טעמים.', category: 'קינוחים', ingredients: [{ ingredientId: '115', name: 'סוכר', quantity: 200, unit: 'g', costPerUnit: 5 }, { ingredientId: '122', name: 'ביצים', quantity: 3, unit: 'pcs', costPerUnit: 1.2 }], steps: [{ order: 1, type: 'step', instruction: 'להכין מרנג עם חלבונים וסוכר.', duration: 12 }, { order: 2, type: 'step', instruction: 'לקפל קמח שקדים. לזרום ולהניח 30 דקות.', duration: 40 }, { order: 3, type: 'step', instruction: 'לאפות ב-150 מעלות 14 דקות. למלא ולהצמיד.', duration: 25 }], yield: 20, yieldUnit: 'זוגות', sellingPrice: 12, tags: ['קינוחים', 'צרפתי', 'פרמיום'] },
  { name: 'טארט טאטן', description: 'טארט תפוחים הפוך קלאסי עם קרמל חמאה.', category: 'קינוחים', ingredients: [{ ingredientId: '108', name: 'קמח', quantity: 200, unit: 'g', costPerUnit: 8 }, { ingredientId: '111', name: 'חמאה', quantity: 150, unit: 'g', costPerUnit: 42 }, { ingredientId: '115', name: 'סוכר', quantity: 120, unit: 'g', costPerUnit: 5 }], steps: [{ order: 1, type: 'step', instruction: 'להכין קרמל חמאה במחבת. לסדר פלחי תפוחים.', duration: 15 }, { order: 2, type: 'step', instruction: 'לכסות בבצק פריך ולאפות ב-190 מעלות 35 דקות.', duration: 35 }, { order: 3, type: 'step', instruction: 'להפוך על צלחת מיד עם ההוצאה מהתנור.', duration: 3 }], yield: 8, yieldUnit: 'מנות', sellingPrice: 42, tags: ['קינוחים', 'צרפתי'] },
  // NEW: עוגות
  { name: 'עוגת אופרה', description: 'עוגת אופרה צרפתית קלאסית - שכבות ביסקוויט שקדים, גנאש וקרם קפה.', category: 'עוגות', ingredients: [{ ingredientId: '127', name: 'שוקולד', quantity: 250, unit: 'g', costPerUnit: 48 }, { ingredientId: '122', name: 'ביצים', quantity: 6, unit: 'pcs', costPerUnit: 1.2 }, { ingredientId: '111', name: 'חמאה', quantity: 200, unit: 'g', costPerUnit: 42 }], steps: [{ order: 1, type: 'step', instruction: 'להכין ביסקוויט ז\'וקונד - 3 שכבות דקות.', duration: 30 }, { order: 2, type: 'step', instruction: 'להכין גנאש שוקולד וקרם חמאה בטעם קפה.', duration: 20 }, { order: 3, type: 'step', instruction: 'להרכיב שכבות ולצנן. לציפוי גנאש מבריק.', duration: 25 }], yield: 12, yieldUnit: 'מנות', sellingPrice: 165, tags: ['עוגות', 'צרפתי', 'פרמיום'] },
  { name: 'עוגת פריזייר', description: 'עוגת תותים צרפתית עם קרם מוסלין ותותים טריים.', category: 'עוגות', ingredients: [{ ingredientId: '108', name: 'קמח', quantity: 200, unit: 'g', costPerUnit: 8 }, { ingredientId: '122', name: 'ביצים', quantity: 5, unit: 'pcs', costPerUnit: 1.2 }, { ingredientId: '115', name: 'סוכר', quantity: 180, unit: 'g', costPerUnit: 5 }], steps: [{ order: 1, type: 'step', instruction: 'להכין ג\'נואז (ספוג צרפתי).', duration: 30 }, { order: 2, type: 'step', instruction: 'להכין קרם מוסלין (פטיסייר + חמאה).', duration: 20 }, { order: 3, type: 'step', instruction: 'להרכיב עם תותים טריים ולצנן.', duration: 20 }], yield: 10, yieldUnit: 'מנות', sellingPrice: 155, tags: ['עוגות', 'צרפתי', 'חלבי'] },
  { name: 'טארט שוקולד', description: 'טארט שוקולד מריר על בצק פריך עם גנאש חלק.', category: 'עוגות', ingredients: [{ ingredientId: '127', name: 'שוקולד', quantity: 300, unit: 'g', costPerUnit: 48 }, { ingredientId: '111', name: 'חמאה', quantity: 100, unit: 'g', costPerUnit: 42 }], steps: [{ order: 1, type: 'step', instruction: 'להכין ולאפות בצק פריך.', duration: 40 }, { order: 2, type: 'step', instruction: 'להכין גנאש שוקולד ולשפוך לתוך הטארט.', duration: 10 }, { order: 3, type: 'step', instruction: 'לצנן 3 שעות עד להתמצקות. לקשט בקקאו.', duration: 5 }], yield: 10, yieldUnit: 'מנות', sellingPrice: 48, tags: ['עוגות', 'שוקולד', 'צרפתי'] },
];

// ─── Store 35: Noa's Kitchen (Home bakery) ───
const STORE_35_NEW: NewRecipe[] = [
  // עוגות
  { name: 'עוגת שיש', description: 'עוגת שיש קלאסית - שילוב מושלם של וניל ושוקולד.', category: 'עוגות', ingredients: [{ ingredientId: '108', name: 'קמח', quantity: 300, unit: 'g', costPerUnit: 8 }, { ingredientId: '111', name: 'חמאה', quantity: 200, unit: 'g', costPerUnit: 42 }, { ingredientId: '122', name: 'ביצים', quantity: 4, unit: 'pcs', costPerUnit: 1.2 }], steps: [{ order: 1, type: 'step', instruction: 'להקציף חמאה וסוכר. להוסיף ביצים אחת אחת.', duration: 10 }, { order: 2, type: 'step', instruction: 'לחלק הבלילה לשניים, להוסיף קקאו לחצי.', duration: 5 }, { order: 3, type: 'step', instruction: 'לשפוך לסירוגין ולמשוך במרית. לאפות ב-170 מעלות 45 דקות.', duration: 48 }], yield: 12, yieldUnit: 'מנות', sellingPrice: 85, tags: ['עוגות', 'קלאסי'] },
  { name: 'עוגת תפוזים', description: 'עוגת תפוזים עסיסית עם ציפוי סוכר.', category: 'עוגות', ingredients: [{ ingredientId: '108', name: 'קמח', quantity: 250, unit: 'g', costPerUnit: 8 }, { ingredientId: '122', name: 'ביצים', quantity: 3, unit: 'pcs', costPerUnit: 1.2 }, { ingredientId: '115', name: 'סוכר', quantity: 200, unit: 'g', costPerUnit: 5 }], steps: [{ order: 1, type: 'step', instruction: 'לסחוט תפוזים ולגרד קליפה.', duration: 5 }, { order: 2, type: 'step', instruction: 'לערבב מרכיבים רטובים ויבשים.', duration: 8 }, { order: 3, type: 'step', instruction: 'לאפות ב-170 מעלות 40 דקות. לצקת ציפוי סוכר-תפוז.', duration: 45 }], yield: 10, yieldUnit: 'מנות', sellingPrice: 75, tags: ['עוגות', 'הדרים'] },
  { name: 'עוגת שוקולד טבעונית', description: 'עוגת שוקולד עשירה ולחה ללא ביצים וחלב.', category: 'עוגות', ingredients: [{ ingredientId: '108', name: 'קמח', quantity: 300, unit: 'g', costPerUnit: 8 }, { ingredientId: '128', name: 'אבקת קקאו', quantity: 50, unit: 'g', costPerUnit: 38 }, { ingredientId: '115', name: 'סוכר', quantity: 250, unit: 'g', costPerUnit: 5 }], steps: [{ order: 1, type: 'step', instruction: 'לערבב מרכיבים יבשים.', duration: 5 }, { order: 2, type: 'step', instruction: 'להוסיף מים, שמן וחומץ. לערבב עד אחידות.', duration: 5 }, { order: 3, type: 'step', instruction: 'לאפות ב-175 מעלות 30 דקות.', duration: 30 }], yield: 12, yieldUnit: 'מנות', sellingPrice: 80, tags: ['עוגות', 'טבעוני', 'פרווה'] },
  // עוגיות
  { name: 'עוגיות טחינה', description: 'עוגיות טחינה פריכות עם שומשום - ללא גלוטן.', category: 'עוגיות', ingredients: [{ ingredientId: '115', name: 'סוכר', quantity: 150, unit: 'g', costPerUnit: 5 }, { ingredientId: '122', name: 'ביצים', quantity: 1, unit: 'pcs', costPerUnit: 1.2 }], steps: [{ order: 1, type: 'step', instruction: 'לערבב טחינה גולמית, סוכר וביצה.', duration: 5 }, { order: 2, type: 'step', instruction: 'לגלגל כדורים, לטבול בשומשום.', duration: 8 }, { order: 3, type: 'step', instruction: 'לאפות ב-170 מעלות 12 דקות.', duration: 12 }], yield: 20, yieldUnit: 'עוגיות', sellingPrice: 6, tags: ['עוגיות', 'ללא גלוטן', 'פרווה'] },
  { name: 'עוגיות שיבולת שועל וצימוקים', description: 'עוגיות בריאות עם שיבולת שועל, צימוקים ודבש.', category: 'עוגיות', ingredients: [{ ingredientId: '108', name: 'קמח', quantity: 150, unit: 'g', costPerUnit: 8 }, { ingredientId: '122', name: 'ביצים', quantity: 1, unit: 'pcs', costPerUnit: 1.2 }], steps: [{ order: 1, type: 'step', instruction: 'לערבב חמאה, דבש וסוכר חום.', duration: 5 }, { order: 2, type: 'step', instruction: 'להוסיף ביצה, קמח, שיבולת שועל וצימוקים.', duration: 5 }, { order: 3, type: 'step', instruction: 'לגלגל כדורים, לשטח ולאפות ב-175 מעלות 12 דקות.', duration: 12 }], yield: 24, yieldUnit: 'עוגיות', sellingPrice: 5, tags: ['עוגיות', 'בריא'] },
  // קינוחים
  { name: 'טירמיסו', description: 'טירמיסו איטלקי קלאסי עם מסקרפונה וקפה.', category: 'קינוחים', ingredients: [{ ingredientId: '122', name: 'ביצים', quantity: 4, unit: 'pcs', costPerUnit: 1.2 }, { ingredientId: '115', name: 'סוכר', quantity: 100, unit: 'g', costPerUnit: 5 }], steps: [{ order: 1, type: 'step', instruction: 'להקציף חלמונים עם סוכר, לקפל מסקרפונה.', duration: 10 }, { order: 2, type: 'step', instruction: 'לטבול ביסקוויטים בקפה ולסדר שכבות.', duration: 10 }, { order: 3, type: 'step', instruction: 'לצנן 6 שעות. לפזר קקאו לפני הגשה.', duration: 5 }], yield: 8, yieldUnit: 'מנות', sellingPrice: 35, tags: ['קינוחים', 'חלבי'] },
  { name: 'מוס שוקולד', description: 'מוס שוקולד מריר אוורירי ועשיר.', category: 'קינוחים', ingredients: [{ ingredientId: '127', name: 'שוקולד מריר', quantity: 200, unit: 'g', costPerUnit: 48 }, { ingredientId: '122', name: 'ביצים', quantity: 4, unit: 'pcs', costPerUnit: 1.2 }], steps: [{ order: 1, type: 'step', instruction: 'להמיס שוקולד ולצנן מעט.', duration: 5 }, { order: 2, type: 'step', instruction: 'להקציף חלבונים, לקפל לשוקולד.', duration: 8 }, { order: 3, type: 'step', instruction: 'לחלק לכוסות ולצנן 4 שעות.', duration: 5 }], yield: 6, yieldUnit: 'כוסות', sellingPrice: 28, tags: ['קינוחים', 'שוקולד', 'ללא גלוטן'] },
  { name: 'כדורי שוקולד', description: 'כדורי שוקולד ביתיים מצופים בקוקוס או סוכריות.', category: 'קינוחים', ingredients: [{ ingredientId: '127', name: 'שוקולד', quantity: 200, unit: 'g', costPerUnit: 48 }, { ingredientId: '111', name: 'חמאה', quantity: 50, unit: 'g', costPerUnit: 42 }], steps: [{ order: 1, type: 'step', instruction: 'לפורר ביסקוויטים, לערבב עם קקאו וחמאה מומסת.', duration: 10 }, { order: 2, type: 'step', instruction: 'לגלגל כדורים ולטבול בשוקולד מומס.', duration: 15 }, { order: 3, type: 'step', instruction: 'לגלגל בקוקוס או סוכריות. לצנן שעה.', duration: 5 }], yield: 20, yieldUnit: 'יחידות', sellingPrice: 5, tags: ['קינוחים', 'חלבי', 'קל'] },
  // מאפים
  { name: 'מאפינס שוקולד', description: 'מאפינס שוקולד רכים עם שוקולד צ\'יפס.', category: 'מאפים', ingredients: [{ ingredientId: '108', name: 'קמח', quantity: 250, unit: 'g', costPerUnit: 8 }, { ingredientId: '128', name: 'קקאו', quantity: 30, unit: 'g', costPerUnit: 38 }, { ingredientId: '122', name: 'ביצים', quantity: 2, unit: 'pcs', costPerUnit: 1.2 }], steps: [{ order: 1, type: 'step', instruction: 'לערבב מרכיבים יבשים. בנפרד - רטובים.', duration: 5 }, { order: 2, type: 'step', instruction: 'לחבר בעדינות, לקפל שוקולד צ\'יפס.', duration: 5 }, { order: 3, type: 'step', instruction: 'לחלק לתבניות ולאפות ב-180 מעלות 20 דקות.', duration: 20 }], yield: 12, yieldUnit: 'יחידות', sellingPrice: 10, tags: ['מאפים', 'שוקולד'] },
  { name: 'לחם בננה', description: 'לחם בננה עסיסי עם אגוזי מלך.', category: 'מאפים', ingredients: [{ ingredientId: '108', name: 'קמח', quantity: 250, unit: 'g', costPerUnit: 8 }, { ingredientId: '122', name: 'ביצים', quantity: 2, unit: 'pcs', costPerUnit: 1.2 }, { ingredientId: '115', name: 'סוכר', quantity: 150, unit: 'g', costPerUnit: 5 }], steps: [{ order: 1, type: 'step', instruction: 'למעוך בננות בשלות. לערבב עם שמן וסוכר.', duration: 5 }, { order: 2, type: 'step', instruction: 'להוסיף ביצים, קמח ואגוזים.', duration: 5 }, { order: 3, type: 'step', instruction: 'לאפות בתבנית אינגליש ב-170 מעלות 50 דקות.', duration: 50 }], yield: 10, yieldUnit: 'פרוסות', sellingPrice: 65, tags: ['מאפים', 'קלאסי'] },
  // NEW: לחמים
  { name: 'לחם ביתי', description: 'לחם ביתי פשוט ומושלם - קרום פריך ופנים רך.', category: 'לחמים', ingredients: [{ ingredientId: '108', name: 'קמח', quantity: 500, unit: 'g', costPerUnit: 8 }, { ingredientId: '125', name: 'מלח', quantity: 10, unit: 'g', costPerUnit: 3 }], steps: [{ order: 1, type: 'step', instruction: 'ללוש קמח, מים, שמרים ומלח.', duration: 12 }, { order: 2, type: 'step', instruction: 'לתפיח שעתיים.', duration: 120 }, { order: 3, type: 'step', instruction: 'לעצב ולאפות ב-220 מעלות 30 דקות.', duration: 35 }], yield: 1, yieldUnit: 'כיכר', sellingPrice: 25, tags: ['לחמים', 'קלאסי'] },
  { name: 'חלה', description: 'חלה קלועה ביתית לשבת.', category: 'לחמים', ingredients: [{ ingredientId: '108', name: 'קמח', quantity: 500, unit: 'g', costPerUnit: 8 }, { ingredientId: '122', name: 'ביצים', quantity: 3, unit: 'pcs', costPerUnit: 1.2 }], steps: [{ order: 1, type: 'step', instruction: 'להפעיל שמרים עם מים חמים וסוכר.', duration: 10 }, { order: 2, type: 'step', instruction: 'ללוש עם קמח, ביצים, שמן ומלח. לתפיח שעה.', duration: 70 }, { order: 3, type: 'step', instruction: 'לקלוע, למרוח ביצה ולאפות ב-180 מעלות 30 דקות.', duration: 35 }], yield: 1, yieldUnit: 'כיכר', sellingPrice: 30, tags: ['לחמים', 'שבת'] },
];

// ─── Store 36: Saba's Bread (Artisan bread bakery) ───
const STORE_36_NEW: NewRecipe[] = [
  // לחמים
  { name: 'לחם שיפון כהה', description: 'לחם שיפון מלא כהה עם דבש וזרעי קימל.', category: 'לחמים', ingredients: [{ ingredientId: '108', name: 'קמח שיפון', quantity: 350, unit: 'g', costPerUnit: 12 }, { ingredientId: '125', name: 'מלח', quantity: 10, unit: 'g', costPerUnit: 3 }], steps: [{ order: 1, type: 'step', instruction: 'להכין מחמצת שיפון יום קודם.', duration: 10 }, { order: 2, type: 'step', instruction: 'ללוש עם קמח, מלח, דבש וזרעים.', duration: 15 }, { order: 3, type: 'step', instruction: 'תפיחה ארוכה 4 שעות. לאפות ב-210 מעלות 45 דקות.', duration: 60 }], yield: 1, yieldUnit: 'כיכר', sellingPrice: 35, tags: ['לחמים', 'מחמצת'] },
  { name: 'צ\'בטה', description: 'לחם איטלקי עם חורים גדולים וקרום פריך.', category: 'לחמים', ingredients: [{ ingredientId: '108', name: 'קמח', quantity: 500, unit: 'g', costPerUnit: 8 }, { ingredientId: '125', name: 'מלח', quantity: 12, unit: 'g', costPerUnit: 3 }], steps: [{ order: 1, type: 'step', instruction: 'לערבב בצק רטוב מאוד (80% הידרציה). לקפל כל 30 דקות.', duration: 15 }, { order: 2, type: 'step', instruction: 'תפיחה 3 שעות עם 4 קיפולים.', duration: 180 }, { order: 3, type: 'step', instruction: 'לחתוך ולעצב בעדינות. לאפות ב-240 מעלות 20 דקות.', duration: 25 }], yield: 2, yieldUnit: 'כיכרות', sellingPrice: 28, tags: ['לחמים', 'איטלקי'] },
  { name: 'בגט מחמצת', description: 'בגט צרפתי ארוך על בסיס מחמצת טבעית.', category: 'לחמים', ingredients: [{ ingredientId: '108', name: 'קמח', quantity: 400, unit: 'g', costPerUnit: 8 }, { ingredientId: '125', name: 'מלח', quantity: 10, unit: 'g', costPerUnit: 3 }], steps: [{ order: 1, type: 'step', instruction: 'לערבב מחמצת, קמח, מים ומלח.', duration: 10 }, { order: 2, type: 'step', instruction: 'תפיחה ארוכה עם קיפולים - 4 שעות.', duration: 240 }, { order: 3, type: 'step', instruction: 'לעצב בגטים, תפיחה סופית 45 דקות. חריצים ואפייה ב-250 מעלות.', duration: 60 }], yield: 3, yieldUnit: 'בגטים', sellingPrice: 18, tags: ['לחמים', 'מחמצת', 'צרפתי'] },
  // חלות
  { name: 'חלה מתוקה', description: 'חלה מתוקה עם צימוקים ודבש - מושלמת לראש השנה.', category: 'חלות', ingredients: [{ ingredientId: '108', name: 'קמח', quantity: 500, unit: 'g', costPerUnit: 8 }, { ingredientId: '122', name: 'ביצים', quantity: 4, unit: 'pcs', costPerUnit: 1.2 }, { ingredientId: '115', name: 'סוכר', quantity: 100, unit: 'g', costPerUnit: 5 }], steps: [{ order: 1, type: 'step', instruction: 'להפעיל שמרים. ללוש עם דבש, ביצים ושמן.', duration: 15 }, { order: 2, type: 'step', instruction: 'לקפל צימוקים. לתפיח שעה.', duration: 65 }, { order: 3, type: 'step', instruction: 'לקלוע חלה עגולה. לתפיח, למרוח ביצה ודבש. לאפות ב-175 מעלות.', duration: 45 }], yield: 1, yieldUnit: 'כיכר', sellingPrice: 38, tags: ['חלות', 'חגים'] },
  { name: 'חלת שוקולד', description: 'חלה קלועה במילוי ממרח שוקולד עשיר.', category: 'חלות', ingredients: [{ ingredientId: '108', name: 'קמח', quantity: 500, unit: 'g', costPerUnit: 8 }, { ingredientId: '122', name: 'ביצים', quantity: 3, unit: 'pcs', costPerUnit: 1.2 }, { ingredientId: '127', name: 'שוקולד', quantity: 150, unit: 'g', costPerUnit: 48 }], steps: [{ order: 1, type: 'step', instruction: 'ללוש בצק חלה בסיסי. לתפיח שעה.', duration: 70 }, { order: 2, type: 'step', instruction: 'לרדד, למרוח שוקולד ולקלוע.', duration: 15 }, { order: 3, type: 'step', instruction: 'לתפיח 30 דקות. למרוח ביצה ולאפות ב-175 מעלות 30 דקות.', duration: 60 }], yield: 1, yieldUnit: 'כיכר', sellingPrice: 42, tags: ['חלות', 'שוקולד'] },
  // NEW: בייגלים
  { name: 'בייגל קלאסי', description: 'בייגל ניו-יורקי אותנטי - מבושל ואפוי.', category: 'בייגלים', ingredients: [{ ingredientId: '108', name: 'קמח', quantity: 500, unit: 'g', costPerUnit: 8 }, { ingredientId: '125', name: 'מלח', quantity: 10, unit: 'g', costPerUnit: 3 }], steps: [{ order: 1, type: 'step', instruction: 'ללוש בצק מוצק. לתפיח שעה.', duration: 70 }, { order: 2, type: 'step', instruction: 'לחלק ולעצב בייגלים. להניח במקרר בין לילה.', duration: 15 }, { order: 3, type: 'step', instruction: 'לבשל 1 דקה בכל צד במים עם דבש. לאפות ב-220 מעלות 15 דקות.', duration: 25 }], yield: 8, yieldUnit: 'יחידות', sellingPrice: 8, tags: ['בייגלים'] },
  { name: 'בייגל שומשום', description: 'בייגל מצופה שומשום זהוב.', category: 'בייגלים', ingredients: [{ ingredientId: '108', name: 'קמח', quantity: 500, unit: 'g', costPerUnit: 8 }, { ingredientId: '125', name: 'מלח', quantity: 10, unit: 'g', costPerUnit: 3 }], steps: [{ order: 1, type: 'step', instruction: 'ללוש בצק מוצק. לתפיח שעה.', duration: 70 }, { order: 2, type: 'step', instruction: 'לעצב בייגלים. להניח במקרר בין לילה.', duration: 15 }, { order: 3, type: 'step', instruction: 'לבשל, לטבול בשומשום ולאפות ב-220 מעלות 15 דקות.', duration: 25 }], yield: 8, yieldUnit: 'יחידות', sellingPrice: 9, tags: ['בייגלים', 'שומשום'] },
  { name: 'בייגל הכל', description: 'בייגל everything - פרג, שומשום, שום, בצל ומלח גס.', category: 'בייגלים', ingredients: [{ ingredientId: '108', name: 'קמח', quantity: 500, unit: 'g', costPerUnit: 8 }, { ingredientId: '125', name: 'מלח', quantity: 10, unit: 'g', costPerUnit: 3 }], steps: [{ order: 1, type: 'step', instruction: 'ללוש בצק מוצק. לתפיח שעה.', duration: 70 }, { order: 2, type: 'step', instruction: 'לעצב בייגלים. להניח במקרר בין לילה.', duration: 15 }, { order: 3, type: 'step', instruction: 'לבשל, לטבול בתערובת תיבול ולאפות ב-220 מעלות 15 דקות.', duration: 25 }], yield: 8, yieldUnit: 'יחידות', sellingPrice: 10, tags: ['בייגלים'] },
  // NEW: לחמניות
  { name: 'לחמניות המבורגר', description: 'לחמניות המבורגר רכות עם שומשום.', category: 'לחמניות', ingredients: [{ ingredientId: '108', name: 'קמח', quantity: 500, unit: 'g', costPerUnit: 8 }, { ingredientId: '111', name: 'חמאה', quantity: 50, unit: 'g', costPerUnit: 42 }, { ingredientId: '122', name: 'ביצים', quantity: 2, unit: 'pcs', costPerUnit: 1.2 }], steps: [{ order: 1, type: 'step', instruction: 'ללוש בצק מועשר. לתפיח שעה.', duration: 70 }, { order: 2, type: 'step', instruction: 'לחלק ולעצב כדורים שטוחים. לתפיח 30 דקות.', duration: 35 }, { order: 3, type: 'step', instruction: 'למרוח ביצה, לפזר שומשום. לאפות ב-190 מעלות 15 דקות.', duration: 15 }], yield: 8, yieldUnit: 'יחידות', sellingPrice: 7, tags: ['לחמניות'] },
  { name: 'לחמניות בריוש', description: 'לחמניות בריוש צרפתיות - עשירות ורכות.', category: 'לחמניות', ingredients: [{ ingredientId: '108', name: 'קמח', quantity: 400, unit: 'g', costPerUnit: 8 }, { ingredientId: '111', name: 'חמאה', quantity: 200, unit: 'g', costPerUnit: 42 }, { ingredientId: '122', name: 'ביצים', quantity: 4, unit: 'pcs', costPerUnit: 1.2 }], steps: [{ order: 1, type: 'step', instruction: 'ללוש בצק בריוש עם חמאה. לצנן במקרר בין לילה.', duration: 20 }, { order: 2, type: 'step', instruction: 'לעצב לחמניות עם כדור קטן למעלה. לתפיח שעה.', duration: 65 }, { order: 3, type: 'step', instruction: 'למרוח ביצה ולאפות ב-180 מעלות 18 דקות.', duration: 18 }], yield: 12, yieldUnit: 'יחידות', sellingPrice: 10, tags: ['לחמניות', 'צרפתי'] },
  { name: 'לחמניות כוסמין', description: 'לחמניות בריאות מקמח כוסמין מלא.', category: 'לחמניות', ingredients: [{ ingredientId: '108', name: 'קמח כוסמין', quantity: 400, unit: 'g', costPerUnit: 15 }, { ingredientId: '125', name: 'מלח', quantity: 8, unit: 'g', costPerUnit: 3 }], steps: [{ order: 1, type: 'step', instruction: 'ללוש קמח כוסמין, מים, שמרים, דבש ומלח.', duration: 12 }, { order: 2, type: 'step', instruction: 'לתפיח שעה. לחלק ולעצב לחמניות.', duration: 70 }, { order: 3, type: 'step', instruction: 'לפזר זרעים ולאפות ב-200 מעלות 18 דקות.', duration: 20 }], yield: 8, yieldUnit: 'יחידות', sellingPrice: 8, tags: ['לחמניות', 'בריאות'] },
];

const STORE_CONFIGS: Record<number, { categories: string[]; existingAssignments: Record<string, string>; newRecipes: NewRecipe[] }> = {
  1: {
    categories: ['Cakes', 'Pastries', 'Desserts', 'Fillings', 'Cookies', 'Breads'],
    existingAssignments: {
      'Chocolate Cake': 'Cakes',
      'Chocolate Cake With Truffles': 'Cakes',
      'Honey Walnut Cake': 'Cakes',
      'Chocolate Eclairs': 'Pastries',
      'Cream Cheese Rugelach': 'Pastries',
      'Cream Puffs with Vanilla Filling': 'Pastries',
      'Classic Chocolate Brownies': 'Desserts',
      'Chocolate Truffles': 'Desserts',
      'Chocolate Ganache': 'Fillings',
      'Vanilla Pastry Cream': 'Fillings',
    },
    newRecipes: STORE_1_NEW,
  },
  6: {
    categories: ['עוגות', 'מאפים', 'לחמים', 'עוגיות', 'קינוחים'],
    existingAssignments: {
      'עוגת שוקולד בלגי': 'עוגות',
      'עוגת גבינה אפויה': 'עוגות',
      'עוגת שכבות פקאן-קרמל': 'עוגות',
      'עוגת תפוחים וקינמון': 'עוגות',
      'בורקס גבינה ותרד': 'מאפים',
      'רוגלך שוקולד ואגוזים': 'מאפים',
      'רולדת קינמון': 'מאפים',
      'חלה מסורתית': 'לחמים',
      'בבקה שוקולד': 'לחמים',
      'עוגיות שוקולד צ\'יפס': 'עוגיות',
    },
    newRecipes: STORE_6_NEW,
  },
  34: {
    categories: ['מאפים', 'לחמים', 'קינוחים', 'עוגות'],
    existingAssignments: {
      'קרואסון חמאה': 'מאפים',
      'פאן-או-שוקולה': 'מאפים',
      'בגט צרפתי': 'לחמים',
      'אקלר שוקולד': 'קינוחים',
      'טארט פירות יער': 'קינוחים',
    },
    newRecipes: STORE_34_NEW,
  },
  35: {
    categories: ['עוגות', 'עוגיות', 'קינוחים', 'מאפים', 'לחמים'],
    existingAssignments: {
      'עוגת גזר': 'עוגות',
      'עוגיות שוקולד צ\'יפס': 'עוגיות',
      'עוגיות שקדים': 'עוגיות',
      'בראוניז שוקולד': 'קינוחים',
      'מאפינס אוכמניות': 'מאפים',
    },
    newRecipes: STORE_35_NEW,
  },
  36: {
    categories: ['לחמים', 'חלות', 'בייגלים', 'לחמניות'],
    existingAssignments: {
      'לחם מחמצת קלאסי': 'לחמים',
      'לחם כוסמין וזרעים': 'לחמים',
      'פוקאצ\'ה שמן זית': 'לחמים',
      'חלה מסורתית': 'חלות',
      'לחמניות שבת': 'חלות',
    },
    newRecipes: STORE_36_NEW,
  },
};

async function main() {
  const pgClient = new pg.Client(PG_URL);
  const mongoClient = new MongoClient(MONGO_URL);

  try {
    await pgClient.connect();
    await mongoClient.connect();
    const db = mongoClient.db('mise');
    const recipes = db.collection('recipes');

    // Step 1: Clear existing categories (cascade removes nothing since FK is in mongo)
    await pgClient.query('DELETE FROM recipe_categories');
    console.log('Cleared all existing categories');

    // Step 2: Unset categoryId from all recipes
    await recipes.updateMany({}, { $unset: { categoryId: '' } });
    console.log('Removed categoryId from all recipes\n');

    let totalNewRecipes = 0;

    for (const [storeIdStr, config] of Object.entries(STORE_CONFIGS)) {
      const storeId = Number(storeIdStr);
      console.log(`\n=== Store ${storeId} ===`);

      // Create categories
      const categoryMap: Record<string, number> = {};
      for (const name of config.categories) {
        const result = await pgClient.query(
          'INSERT INTO recipe_categories (store_id, name) VALUES ($1, $2) RETURNING id',
          [storeId, name],
        );
        categoryMap[name] = result.rows[0].id;
        console.log(`  Category: ${name} (id: ${result.rows[0].id})`);
      }

      // Assign existing recipes
      for (const [recipeName, categoryName] of Object.entries(config.existingAssignments)) {
        const categoryId = categoryMap[categoryName];
        const filter: Record<string, unknown> =
          storeId === 1
            ? { name: recipeName, $or: [{ storeId: 1 }, { storeId: { $exists: false } }] }
            : { name: recipeName, storeId };
        await recipes.updateMany(filter, { $set: { categoryId } });
      }
      console.log(`  Assigned ${Object.keys(config.existingAssignments).length} existing recipes`);

      // Create new recipes
      for (const recipe of config.newRecipes) {
        const categoryId = categoryMap[recipe.category];
        const now = new Date();
        await recipes.insertOne({
          name: recipe.name,
          description: recipe.description,
          ingredients: recipe.ingredients,
          steps: recipe.steps,
          yield: recipe.yield,
          yieldUnit: recipe.yieldUnit,
          sellingPrice: recipe.sellingPrice,
          tags: recipe.tags,
          notes: recipe.notes,
          photos: [],
          isPublished: true,
          storeId,
          categoryId,
          totalCost: 0,
          costPerUnit: 0,
          createdAt: now,
          updatedAt: now,
        });
        totalNewRecipes++;
      }
      console.log(`  Created ${config.newRecipes.length} new recipes`);
    }

    console.log(`\n✓ Done! Created ${totalNewRecipes} new recipes total.`);
  } finally {
    await pgClient.end();
    await mongoClient.close();
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
