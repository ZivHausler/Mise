/**
 * Seed script: Create 3 demo stores with inventory, recipes (with photos),
 * upgrade to Basic plan, enable storefront, and publish recipes.
 *
 * Usage: npx tsx scripts/seed-stores.ts
 */

import pg from 'pg';
import { MongoClient, ObjectId } from 'mongodb';

const PG_URL = 'postgresql://mise:mise@localhost:5432/mise';
const MONGO_URL = 'mongodb://localhost:27017/mise';

// Link all stores to user 1 (Ziv Housler)
const OWNER_USER_ID = 1;
const OWNER_ROLE = 1; // OWNER
const BASIC_PLAN_ID = 2;

// ─── Store Definitions ──────────────────────────────────────────

interface StoreDef {
  name: string;
  slug: string;
  address: string;
  phone: string;
  description: string;
  theme: string;
  logoUrl: string;
  bannerUrl: string;
  ingredients: { name: string; unit: string; quantity: number; costPerUnit: number; lowStockThreshold: number }[];
  recipes: {
    name: string;
    description: string;
    tags: string[];
    sellingPrice: number;
    photos: string[];
    ingredients: { ingredientName: string; quantity: number; unit: string }[];
    steps: { order: number; type: string; instruction: string; duration?: number }[];
    yield?: number;
    yieldUnit?: string;
  }[];
}

const STORES: StoreDef[] = [
  {
    name: 'Le Petit Four',
    slug: 'le-petit-four',
    address: 'דיזנגוף 99, תל אביב',
    phone: '03-5551234',
    description: 'French-inspired pastries & artisan breads in the heart of Tel Aviv',
    theme: 'rose',
    logoUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038024a?w=200&h=200&fit=crop',
    bannerUrl: 'https://images.unsplash.com/photo-1517433670267-08bbd4be890f?w=800&h=400&fit=crop',
    ingredients: [
      { name: 'קמח לבן', unit: 'kg', quantity: 50, costPerUnit: 4.5, lowStockThreshold: 10 },
      { name: 'חמאה', unit: 'kg', quantity: 20, costPerUnit: 42, lowStockThreshold: 5 },
      { name: 'סוכר', unit: 'kg', quantity: 30, costPerUnit: 5.5, lowStockThreshold: 8 },
      { name: 'ביצים', unit: 'units', quantity: 200, costPerUnit: 1.2, lowStockThreshold: 50 },
      { name: 'שוקולד מריר', unit: 'kg', quantity: 10, costPerUnit: 65, lowStockThreshold: 3 },
      { name: 'שמנת מתוקה', unit: 'L', quantity: 15, costPerUnit: 18, lowStockThreshold: 5 },
      { name: 'שמרים', unit: 'kg', quantity: 3, costPerUnit: 35, lowStockThreshold: 1 },
      { name: 'מלח', unit: 'kg', quantity: 5, costPerUnit: 3, lowStockThreshold: 2 },
    ],
    recipes: [
      {
        name: 'קרואסון חמאה',
        description: 'קרואסון צרפתי קלאסי עם שכבות חמאה פריכות',
        tags: ['מאפים', 'ארוחת בוקר'],
        sellingPrice: 14,
        photos: [
          'https://images.unsplash.com/photo-1555507036-ab1f4038024a?w=600&h=600&fit=crop',
          'https://images.unsplash.com/photo-1623334044303-241021148842?w=600&h=600&fit=crop',
        ],
        ingredients: [
          { ingredientName: 'קמח לבן', quantity: 0.5, unit: 'kg' },
          { ingredientName: 'חמאה', quantity: 0.25, unit: 'kg' },
          { ingredientName: 'סוכר', quantity: 0.03, unit: 'kg' },
          { ingredientName: 'שמרים', quantity: 0.01, unit: 'kg' },
          { ingredientName: 'מלח', quantity: 0.01, unit: 'kg' },
        ],
        steps: [
          { order: 1, type: 'step', instruction: 'הכינו בצק קרואסון - ערבבו קמח, סוכר, מלח ושמרים', duration: 15 },
          { order: 2, type: 'step', instruction: 'הוסיפו חמאה קרה בשכבות וקפלו 3 פעמים', duration: 30 },
          { order: 3, type: 'step', instruction: 'הניחו במקרר ל-2 שעות', duration: 120 },
          { order: 4, type: 'step', instruction: 'גלגלו, חתכו משולשים וגלגלו לצורת קרואסון', duration: 20 },
          { order: 5, type: 'step', instruction: 'אפו ב-200°C למשך 18-20 דקות', duration: 20 },
        ],
        yield: 12,
        yieldUnit: 'units',
      },
      {
        name: 'פאן-או-שוקולה',
        description: 'מאפה צרפתי עם מילוי שוקולד מריר',
        tags: ['מאפים', 'ארוחת בוקר'],
        sellingPrice: 16,
        photos: [
          'https://images.unsplash.com/photo-1530610476181-d83430b64dcd?w=600&h=600&fit=crop',
        ],
        ingredients: [
          { ingredientName: 'קמח לבן', quantity: 0.5, unit: 'kg' },
          { ingredientName: 'חמאה', quantity: 0.2, unit: 'kg' },
          { ingredientName: 'שוקולד מריר', quantity: 0.15, unit: 'kg' },
          { ingredientName: 'סוכר', quantity: 0.04, unit: 'kg' },
          { ingredientName: 'שמרים', quantity: 0.01, unit: 'kg' },
        ],
        steps: [
          { order: 1, type: 'step', instruction: 'הכינו בצק שמרים עם חמאה', duration: 20 },
          { order: 2, type: 'step', instruction: 'הניחו מקלות שוקולד במרכז הבצק', duration: 10 },
          { order: 3, type: 'step', instruction: 'גלגלו וסגרו היטב', duration: 10 },
          { order: 4, type: 'step', instruction: 'אפו ב-190°C למשך 15 דקות', duration: 15 },
        ],
        yield: 10,
        yieldUnit: 'units',
      },
      {
        name: 'טארט פירות יער',
        description: 'טארט קרם פטיסייר עם פירות יער טריים',
        tags: ['עוגות', 'קינוחים'],
        sellingPrice: 28,
        photos: [
          'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&h=600&fit=crop',
        ],
        ingredients: [
          { ingredientName: 'קמח לבן', quantity: 0.3, unit: 'kg' },
          { ingredientName: 'חמאה', quantity: 0.15, unit: 'kg' },
          { ingredientName: 'סוכר', quantity: 0.1, unit: 'kg' },
          { ingredientName: 'ביצים', quantity: 4, unit: 'units' },
          { ingredientName: 'שמנת מתוקה', quantity: 0.3, unit: 'L' },
        ],
        steps: [
          { order: 1, type: 'step', instruction: 'הכינו בצק סוכר - ערבבו קמח, חמאה וסוכר', duration: 15 },
          { order: 2, type: 'step', instruction: 'אפו עיוור ב-180°C', duration: 15 },
          { order: 3, type: 'step', instruction: 'הכינו קרם פטיסייר עם שמנת וביצים', duration: 20 },
          { order: 4, type: 'step', instruction: 'מלאו את הטארט בקרם וסדרו פירות יער למעלה', duration: 10 },
        ],
        yield: 1,
        yieldUnit: 'unit',
      },
      {
        name: 'בגט צרפתי',
        description: 'בגט קלאסי עם קרום פריך ופנים רך',
        tags: ['לחמים'],
        sellingPrice: 12,
        photos: [
          'https://images.unsplash.com/photo-1549931319-a545753467c8?w=600&h=600&fit=crop',
        ],
        ingredients: [
          { ingredientName: 'קמח לבן', quantity: 0.6, unit: 'kg' },
          { ingredientName: 'שמרים', quantity: 0.015, unit: 'kg' },
          { ingredientName: 'מלח', quantity: 0.012, unit: 'kg' },
        ],
        steps: [
          { order: 1, type: 'step', instruction: 'ערבבו קמח, מים, שמרים ומלח', duration: 10 },
          { order: 2, type: 'step', instruction: 'לשו 10 דקות עד לבצק חלק', duration: 10 },
          { order: 3, type: 'step', instruction: 'תפיחה ראשונה - שעה', duration: 60 },
          { order: 4, type: 'step', instruction: 'עצבו לצורת בגט וחרצו', duration: 10 },
          { order: 5, type: 'step', instruction: 'אפו ב-230°C עם אדים', duration: 25 },
        ],
        yield: 3,
        yieldUnit: 'units',
      },
      {
        name: 'אקלר שוקולד',
        description: 'אקלר קלאסי עם קרם שוקולד וגלזורה',
        tags: ['קינוחים'],
        sellingPrice: 18,
        photos: [
          'https://images.unsplash.com/photo-1525059696034-4967a8e1dca2?w=600&h=600&fit=crop',
        ],
        ingredients: [
          { ingredientName: 'קמח לבן', quantity: 0.15, unit: 'kg' },
          { ingredientName: 'חמאה', quantity: 0.1, unit: 'kg' },
          { ingredientName: 'ביצים', quantity: 4, unit: 'units' },
          { ingredientName: 'שוקולד מריר', quantity: 0.2, unit: 'kg' },
          { ingredientName: 'שמנת מתוקה', quantity: 0.25, unit: 'L' },
        ],
        steps: [
          { order: 1, type: 'step', instruction: 'הכינו בצק שו - חממו מים וחמאה, הוסיפו קמח', duration: 15 },
          { order: 2, type: 'step', instruction: 'הוסיפו ביצים אחת-אחת', duration: 10 },
          { order: 3, type: 'step', instruction: 'סדקו ואפו ב-200°C', duration: 25 },
          { order: 4, type: 'step', instruction: 'הכינו קרם שוקולד ומלאו', duration: 15 },
          { order: 5, type: 'step', instruction: 'ציפו בגלזורת שוקולד', duration: 10 },
        ],
        yield: 8,
        yieldUnit: 'units',
      },
    ],
  },
  {
    name: 'Noa\'s Kitchen',
    slug: 'noas-kitchen',
    address: 'אמיל זולא 12, ירושלים',
    phone: '02-5559876',
    description: 'Home-style cakes, cookies & seasonal bakes with love',
    theme: 'mint',
    logoUrl: 'https://images.unsplash.com/photo-1486427944544-d2c246c4df6e?w=200&h=200&fit=crop',
    bannerUrl: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800&h=400&fit=crop',
    ingredients: [
      { name: 'קמח לבן', unit: 'kg', quantity: 40, costPerUnit: 4.5, lowStockThreshold: 10 },
      { name: 'סוכר חום', unit: 'kg', quantity: 25, costPerUnit: 8, lowStockThreshold: 5 },
      { name: 'חמאה', unit: 'kg', quantity: 15, costPerUnit: 42, lowStockThreshold: 5 },
      { name: 'ביצים', unit: 'units', quantity: 150, costPerUnit: 1.2, lowStockThreshold: 30 },
      { name: 'וניל', unit: 'units', quantity: 50, costPerUnit: 4, lowStockThreshold: 10 },
      { name: 'שוקולד צ\'יפס', unit: 'kg', quantity: 8, costPerUnit: 55, lowStockThreshold: 2 },
      { name: 'קמח שקדים', unit: 'kg', quantity: 5, costPerUnit: 85, lowStockThreshold: 2 },
      { name: 'שמן קוקוס', unit: 'L', quantity: 5, costPerUnit: 32, lowStockThreshold: 2 },
      { name: 'אבקת אפיה', unit: 'kg', quantity: 3, costPerUnit: 15, lowStockThreshold: 1 },
    ],
    recipes: [
      {
        name: 'עוגיות שוקולד צ\'יפס',
        description: 'עוגיות אמריקאיות קלאסיות עם שוקולד צ\'יפס',
        tags: ['עוגיות'],
        sellingPrice: 8,
        photos: [
          'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=600&h=600&fit=crop',
        ],
        ingredients: [
          { ingredientName: 'קמח לבן', quantity: 0.3, unit: 'kg' },
          { ingredientName: 'חמאה', quantity: 0.15, unit: 'kg' },
          { ingredientName: 'סוכר חום', quantity: 0.15, unit: 'kg' },
          { ingredientName: 'ביצים', quantity: 2, unit: 'units' },
          { ingredientName: 'שוקולד צ\'יפס', quantity: 0.2, unit: 'kg' },
          { ingredientName: 'וניל', quantity: 1, unit: 'units' },
        ],
        steps: [
          { order: 1, type: 'step', instruction: 'הקציפו חמאה וסוכר חום', duration: 5 },
          { order: 2, type: 'step', instruction: 'הוסיפו ביצים ווניל', duration: 3 },
          { order: 3, type: 'step', instruction: 'הוסיפו קמח ושוקולד צ\'יפס', duration: 5 },
          { order: 4, type: 'step', instruction: 'צרו כדורים וסדרו על תבנית', duration: 10 },
          { order: 5, type: 'step', instruction: 'אפו ב-180°C למשך 12 דקות', duration: 12 },
        ],
        yield: 24,
        yieldUnit: 'units',
      },
      {
        name: 'עוגת גזר',
        description: 'עוגת גזר עסיסית עם ציפוי גבינת שמנת',
        tags: ['עוגות'],
        sellingPrice: 45,
        photos: [
          'https://images.unsplash.com/photo-1621303837174-89787a7d4729?w=600&h=600&fit=crop',
        ],
        ingredients: [
          { ingredientName: 'קמח לבן', quantity: 0.35, unit: 'kg' },
          { ingredientName: 'סוכר חום', quantity: 0.2, unit: 'kg' },
          { ingredientName: 'ביצים', quantity: 4, unit: 'units' },
          { ingredientName: 'שמן קוקוס', quantity: 0.2, unit: 'L' },
          { ingredientName: 'אבקת אפיה', quantity: 0.01, unit: 'kg' },
        ],
        steps: [
          { order: 1, type: 'step', instruction: 'גררו גזר טרי', duration: 10 },
          { order: 2, type: 'step', instruction: 'ערבבו מרכיבים יבשים', duration: 5 },
          { order: 3, type: 'step', instruction: 'ערבבו מרכיבים רטובים והוסיפו גזר', duration: 10 },
          { order: 4, type: 'step', instruction: 'אפו ב-170°C למשך 40 דקות', duration: 40 },
          { order: 5, type: 'step', instruction: 'ציפוי גבינת שמנת', duration: 15 },
        ],
        yield: 1,
        yieldUnit: 'unit',
      },
      {
        name: 'בראוניז שוקולד',
        description: 'בראוניז עשירים עם שוקולד כפול',
        tags: ['קינוחים'],
        sellingPrice: 12,
        photos: [
          'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&h=600&fit=crop',
        ],
        ingredients: [
          { ingredientName: 'שוקולד צ\'יפס', quantity: 0.25, unit: 'kg' },
          { ingredientName: 'חמאה', quantity: 0.15, unit: 'kg' },
          { ingredientName: 'סוכר חום', quantity: 0.15, unit: 'kg' },
          { ingredientName: 'ביצים', quantity: 3, unit: 'units' },
          { ingredientName: 'קמח לבן', quantity: 0.1, unit: 'kg' },
        ],
        steps: [
          { order: 1, type: 'step', instruction: 'המיסו שוקולד וחמאה יחד', duration: 5 },
          { order: 2, type: 'step', instruction: 'הוסיפו סוכר וביצים', duration: 5 },
          { order: 3, type: 'step', instruction: 'קפלו את הקמח בעדינות', duration: 3 },
          { order: 4, type: 'step', instruction: 'אפו ב-175°C למשך 25 דקות', duration: 25 },
        ],
        yield: 16,
        yieldUnit: 'units',
      },
      {
        name: 'מאפינס אוכמניות',
        description: 'מאפינס רכים עם אוכמניות טריות',
        tags: ['מאפים', 'ארוחת בוקר'],
        sellingPrice: 10,
        photos: [
          'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=600&h=600&fit=crop',
        ],
        ingredients: [
          { ingredientName: 'קמח לבן', quantity: 0.3, unit: 'kg' },
          { ingredientName: 'סוכר חום', quantity: 0.1, unit: 'kg' },
          { ingredientName: 'ביצים', quantity: 2, unit: 'units' },
          { ingredientName: 'חמאה', quantity: 0.08, unit: 'kg' },
          { ingredientName: 'אבקת אפיה', quantity: 0.01, unit: 'kg' },
        ],
        steps: [
          { order: 1, type: 'step', instruction: 'ערבבו מרכיבים יבשים', duration: 5 },
          { order: 2, type: 'step', instruction: 'ערבבו מרכיבים רטובים', duration: 5 },
          { order: 3, type: 'step', instruction: 'חברו ביחד וקפלו אוכמניות', duration: 5 },
          { order: 4, type: 'step', instruction: 'חלקו לתבנית מאפינס ואפו ב-190°C', duration: 22 },
        ],
        yield: 12,
        yieldUnit: 'units',
      },
      {
        name: 'עוגיות שקדים',
        description: 'עוגיות שקדים פריכות בסגנון איטלקי',
        tags: ['עוגיות'],
        sellingPrice: 9,
        photos: [
          'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&h=600&fit=crop',
        ],
        ingredients: [
          { ingredientName: 'קמח שקדים', quantity: 0.2, unit: 'kg' },
          { ingredientName: 'קמח לבן', quantity: 0.1, unit: 'kg' },
          { ingredientName: 'סוכר חום', quantity: 0.1, unit: 'kg' },
          { ingredientName: 'חמאה', quantity: 0.1, unit: 'kg' },
          { ingredientName: 'ביצים', quantity: 1, unit: 'units' },
        ],
        steps: [
          { order: 1, type: 'step', instruction: 'ערבבו קמח שקדים, קמח וסוכר', duration: 5 },
          { order: 2, type: 'step', instruction: 'הוסיפו חמאה קרה וביצה', duration: 5 },
          { order: 3, type: 'step', instruction: 'צרו עוגיות עגולות', duration: 10 },
          { order: 4, type: 'step', instruction: 'אפו ב-170°C למשך 15 דקות', duration: 15 },
        ],
        yield: 20,
        yieldUnit: 'units',
      },
    ],
  },
  {
    name: 'Saba\'s Bread',
    slug: 'sabas-bread',
    address: 'שדרות בן-גוריון 45, חיפה',
    phone: '04-5557654',
    description: 'Traditional sourdough breads & challahs baked daily',
    theme: 'stone',
    logoUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&h=200&fit=crop',
    bannerUrl: 'https://images.unsplash.com/photo-1568254183919-78a4f43a2877?w=800&h=400&fit=crop',
    ingredients: [
      { name: 'קמח מלא', unit: 'kg', quantity: 60, costPerUnit: 6, lowStockThreshold: 15 },
      { name: 'קמח לבן', unit: 'kg', quantity: 50, costPerUnit: 4.5, lowStockThreshold: 15 },
      { name: 'מחמצת', unit: 'kg', quantity: 5, costPerUnit: 0, lowStockThreshold: 1 },
      { name: 'שמן זית', unit: 'L', quantity: 10, costPerUnit: 38, lowStockThreshold: 3 },
      { name: 'מלח גס', unit: 'kg', quantity: 10, costPerUnit: 5, lowStockThreshold: 3 },
      { name: 'דבש', unit: 'kg', quantity: 5, costPerUnit: 65, lowStockThreshold: 2 },
      { name: 'שמרים טריים', unit: 'kg', quantity: 2, costPerUnit: 25, lowStockThreshold: 1 },
      { name: 'ביצים', unit: 'units', quantity: 100, costPerUnit: 1.2, lowStockThreshold: 30 },
      { name: 'זרעי פשתן', unit: 'kg', quantity: 3, costPerUnit: 45, lowStockThreshold: 1 },
      { name: 'זרעי שומשום', unit: 'kg', quantity: 3, costPerUnit: 35, lowStockThreshold: 1 },
    ],
    recipes: [
      {
        name: 'לחם מחמצת קלאסי',
        description: 'לחם מחמצת בתסיסה איטית של 24 שעות',
        tags: ['לחמים'],
        sellingPrice: 32,
        photos: [
          'https://images.unsplash.com/photo-1585478259715-876acc5be8eb?w=600&h=600&fit=crop',
        ],
        ingredients: [
          { ingredientName: 'קמח לבן', quantity: 0.4, unit: 'kg' },
          { ingredientName: 'קמח מלא', quantity: 0.1, unit: 'kg' },
          { ingredientName: 'מחמצת', quantity: 0.1, unit: 'kg' },
          { ingredientName: 'מלח גס', quantity: 0.01, unit: 'kg' },
        ],
        steps: [
          { order: 1, type: 'step', instruction: 'ערבבו קמח ומים - אוטוליזה 30 דקות', duration: 30 },
          { order: 2, type: 'step', instruction: 'הוסיפו מחמצת ומלח', duration: 10 },
          { order: 3, type: 'step', instruction: 'קיפולים כל 30 דקות (4 סבבים)', duration: 120 },
          { order: 4, type: 'step', instruction: 'תסיסה ארוכה במקרר - 12-18 שעות', duration: 720 },
          { order: 5, type: 'step', instruction: 'עיצוב ותפיחה סופית', duration: 60 },
          { order: 6, type: 'step', instruction: 'אפו בסיר ברזל ב-250°C', duration: 45 },
        ],
        yield: 1,
        yieldUnit: 'unit',
      },
      {
        name: 'חלה מסורתית',
        description: 'חלה רכה וטרייה לשבת',
        tags: ['לחמים', 'שבת'],
        sellingPrice: 28,
        photos: [
          'https://images.unsplash.com/photo-1603379016822-e6d5e2770ece?w=600&h=600&fit=crop',
        ],
        ingredients: [
          { ingredientName: 'קמח לבן', quantity: 0.5, unit: 'kg' },
          { ingredientName: 'שמרים טריים', quantity: 0.02, unit: 'kg' },
          { ingredientName: 'ביצים', quantity: 3, unit: 'units' },
          { ingredientName: 'דבש', quantity: 0.05, unit: 'kg' },
          { ingredientName: 'שמן זית', quantity: 0.06, unit: 'L' },
          { ingredientName: 'מלח גס', quantity: 0.01, unit: 'kg' },
          { ingredientName: 'זרעי שומשום', quantity: 0.02, unit: 'kg' },
        ],
        steps: [
          { order: 1, type: 'step', instruction: 'המיסו שמרים בדבש ומים פושרים', duration: 10 },
          { order: 2, type: 'step', instruction: 'הוסיפו ביצים, שמן וקמח ולשו', duration: 15 },
          { order: 3, type: 'step', instruction: 'תפיחה ראשונה - שעה', duration: 60 },
          { order: 4, type: 'step', instruction: 'קלעו 6 גדילים', duration: 15 },
          { order: 5, type: 'step', instruction: 'מרחו ביצה ופזרו שומשום', duration: 5 },
          { order: 6, type: 'step', instruction: 'אפו ב-180°C למשך 30 דקות', duration: 30 },
        ],
        yield: 1,
        yieldUnit: 'unit',
      },
      {
        name: 'לחם כוסמין וזרעים',
        description: 'לחם בריאות עם קמח מלא, פשתן ושומשום',
        tags: ['לחמים', 'בריאות'],
        sellingPrice: 35,
        photos: [
          'https://images.unsplash.com/photo-1598373182133-52452f7691ef?w=600&h=600&fit=crop',
        ],
        ingredients: [
          { ingredientName: 'קמח מלא', quantity: 0.4, unit: 'kg' },
          { ingredientName: 'קמח לבן', quantity: 0.1, unit: 'kg' },
          { ingredientName: 'מחמצת', quantity: 0.08, unit: 'kg' },
          { ingredientName: 'זרעי פשתן', quantity: 0.03, unit: 'kg' },
          { ingredientName: 'זרעי שומשום', quantity: 0.03, unit: 'kg' },
          { ingredientName: 'דבש', quantity: 0.02, unit: 'kg' },
          { ingredientName: 'מלח גס', quantity: 0.01, unit: 'kg' },
        ],
        steps: [
          { order: 1, type: 'step', instruction: 'השרו זרעים במים למשך שעה', duration: 60 },
          { order: 2, type: 'step', instruction: 'ערבבו קמח, מחמצת, דבש ומלח', duration: 10 },
          { order: 3, type: 'step', instruction: 'קפלו זרעים לתוך הבצק', duration: 10 },
          { order: 4, type: 'step', instruction: 'תסיסה ארוכה - 12 שעות', duration: 720 },
          { order: 5, type: 'step', instruction: 'אפו ב-220°C למשך 40 דקות', duration: 40 },
        ],
        yield: 1,
        yieldUnit: 'unit',
      },
      {
        name: 'פוקאצ\'ה שמן זית',
        description: 'פוקאצ\'ה איטלקית עם שמן זית ורוזמרין',
        tags: ['לחמים'],
        sellingPrice: 25,
        photos: [
          'https://images.unsplash.com/photo-1619535860434-ba1d8fa12536?w=600&h=600&fit=crop',
        ],
        ingredients: [
          { ingredientName: 'קמח לבן', quantity: 0.5, unit: 'kg' },
          { ingredientName: 'שמן זית', quantity: 0.08, unit: 'L' },
          { ingredientName: 'שמרים טריים', quantity: 0.015, unit: 'kg' },
          { ingredientName: 'מלח גס', quantity: 0.015, unit: 'kg' },
        ],
        steps: [
          { order: 1, type: 'step', instruction: 'ערבבו קמח, שמרים, מים ומלח', duration: 10 },
          { order: 2, type: 'step', instruction: 'הוסיפו שמן זית ולשו', duration: 10 },
          { order: 3, type: 'step', instruction: 'תפיחה - שעתיים', duration: 120 },
          { order: 4, type: 'step', instruction: 'שטחו בתבנית, לחצו גומות, שמן זית ומלח', duration: 10 },
          { order: 5, type: 'step', instruction: 'אפו ב-220°C למשך 20 דקות', duration: 20 },
        ],
        yield: 1,
        yieldUnit: 'unit',
      },
      {
        name: 'לחמניות שבת',
        description: 'לחמניות רכות מושלמות לשבת',
        tags: ['לחמים', 'שבת'],
        sellingPrice: 6,
        photos: [
          'https://images.unsplash.com/photo-1586444248879-bc604cbd555a?w=600&h=600&fit=crop',
        ],
        ingredients: [
          { ingredientName: 'קמח לבן', quantity: 0.5, unit: 'kg' },
          { ingredientName: 'שמרים טריים', quantity: 0.02, unit: 'kg' },
          { ingredientName: 'ביצים', quantity: 2, unit: 'units' },
          { ingredientName: 'דבש', quantity: 0.03, unit: 'kg' },
          { ingredientName: 'שמן זית', quantity: 0.04, unit: 'L' },
          { ingredientName: 'מלח גס', quantity: 0.01, unit: 'kg' },
        ],
        steps: [
          { order: 1, type: 'step', instruction: 'הכינו בצק עשיר עם ביצים ודבש', duration: 15 },
          { order: 2, type: 'step', instruction: 'לשו היטב עד שהבצק חלק', duration: 10 },
          { order: 3, type: 'step', instruction: 'תפיחה שעה', duration: 60 },
          { order: 4, type: 'step', instruction: 'חלקו לכדורים ועגלו', duration: 10 },
          { order: 5, type: 'step', instruction: 'מרחו ביצה ואפו ב-180°C', duration: 18 },
        ],
        yield: 12,
        yieldUnit: 'units',
      },
    ],
  },
];

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  const pool = new pg.Pool({ connectionString: PG_URL });
  const mongo = new MongoClient(MONGO_URL);
  await mongo.connect();
  const db = mongo.db();
  const recipesCol = db.collection('recipes');

  console.log('Connected to PostgreSQL and MongoDB\n');

  const createdSlugs: string[] = [];

  for (const storeDef of STORES) {
    console.log(`\n━━━ Creating store: ${storeDef.name} ━━━`);

    // 1. Create store
    const storeRes = await pool.query(
      `INSERT INTO stores (name, slug, address, phone, description, theme, logo_url, banner_url, storefront_enabled, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW())
       RETURNING id`,
      [storeDef.name, storeDef.slug, storeDef.address, storeDef.phone, storeDef.description, storeDef.theme, storeDef.logoUrl, storeDef.bannerUrl],
    );
    const storeId = storeRes.rows[0].id as number;
    console.log(`  Store created: id=${storeId}, slug=${storeDef.slug}`);
    createdSlugs.push(storeDef.slug);

    // 2. Link owner user
    await pool.query(
      `INSERT INTO users_stores (user_id, store_id, role, created_at)
       VALUES ($1, $2, $3, NOW()) ON CONFLICT DO NOTHING`,
      [OWNER_USER_ID, storeId, OWNER_ROLE],
    );
    console.log(`  Owner linked: user_id=${OWNER_USER_ID}`);

    // 3. Initialize invoice counters
    await pool.query(
      `INSERT INTO invoice_counters (store_id, counter_type, last_number)
       VALUES ($1, 'invoice', 0), ($1, 'credit_note', 0)
       ON CONFLICT DO NOTHING`,
      [storeId],
    );

    // 4. Create subscription (Basic plan, active)
    await pool.query(
      `INSERT INTO store_subscriptions (store_id, plan_id, status, current_period_start, current_period_end, billing_anchor_day, created_at, updated_at)
       VALUES ($1, $2, 'active', NOW(), NOW() + INTERVAL '30 days', EXTRACT(DAY FROM NOW())::int, NOW(), NOW())`,
      [storeId, BASIC_PLAN_ID],
    );
    console.log(`  Subscription: Basic plan (active)`);

    // 5. Create ingredients and build lookup map
    const ingredientMap = new Map<string, number>(); // name -> id
    for (const ing of storeDef.ingredients) {
      const ingRes = await pool.query(
        `INSERT INTO ingredients (store_id, name, unit, quantity, cost_per_unit, low_stock_threshold, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING id`,
        [storeId, ing.name, ing.unit, ing.quantity, ing.costPerUnit, ing.lowStockThreshold],
      );
      ingredientMap.set(ing.name, ingRes.rows[0].id as number);
    }
    console.log(`  Ingredients created: ${storeDef.ingredients.length}`);

    // 6. Create recipes in MongoDB (published with photos)
    let recipeCount = 0;
    for (const recipe of storeDef.recipes) {
      const recipeIngredients = recipe.ingredients.map((ri) => ({
        ingredientId: String(ingredientMap.get(ri.ingredientName) ?? 0),
        name: ri.ingredientName,
        quantity: ri.quantity,
        unit: ri.unit,
        costPerUnit: storeDef.ingredients.find((i) => i.name === ri.ingredientName)?.costPerUnit ?? 0,
      }));

      await recipesCol.insertOne({
        storeId,
        name: recipe.name,
        description: recipe.description,
        tags: recipe.tags,
        ingredients: recipeIngredients,
        steps: recipe.steps,
        yield: recipe.yield,
        yieldUnit: recipe.yieldUnit,
        sellingPrice: recipe.sellingPrice,
        photos: recipe.photos,
        notes: '',
        variations: [],
        isPublished: true,
        totalCost: 0,
        costPerUnit: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      recipeCount++;
    }
    console.log(`  Recipes created & published: ${recipeCount}`);
  }

  console.log('\n━━━ Summary ━━━');
  console.log(`Created ${STORES.length} stores with slugs: ${createdSlugs.join(', ')}`);
  console.log('All stores: Basic plan (active), storefront enabled, recipes published');
  console.log('\nUpdate STORE_SLUGS in HomeScreen.tsx to include these slugs');

  await pool.end();
  await mongo.close();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
