export interface StoreCategorySubject {
  key: string;
  subSubjects: string[];
}

export const STORE_CATEGORIES: StoreCategorySubject[] = [
  { key: 'food_bakery', subSubjects: ['bakery', 'pastry_shop', 'confectionery', 'chocolate_shop', 'ice_cream_gelato', 'health_food', 'vegan_vegetarian'] },
  { key: 'cafe_coffee', subSubjects: ['coffee_shop', 'tea_house', 'juice_bar', 'dessert_cafe', 'brunch_spot'] },
  { key: 'restaurant', subSubjects: ['italian', 'asian', 'middle_eastern', 'mediterranean', 'american', 'mexican', 'sushi', 'fast_food', 'fine_dining', 'steakhouse', 'seafood', 'vegetarian'] },
  { key: 'catering_events', subSubjects: ['event_catering', 'corporate_catering', 'private_chef', 'food_truck', 'pop_up_kitchen'] },
  { key: 'fashion_clothing', subSubjects: ['womens_fashion', 'mens_fashion', 'childrens_clothing', 'shoes_footwear', 'accessories', 'jewelry', 'sportswear', 'vintage_secondhand'] },
  { key: 'health_beauty', subSubjects: ['cosmetics', 'skincare', 'hair_care', 'spa_wellness', 'natural_organic', 'perfume'] },
  { key: 'home_living', subSubjects: ['furniture', 'home_decor', 'kitchen_dining', 'gardening', 'textiles', 'lighting'] },
  { key: 'arts_crafts', subSubjects: ['handmade_goods', 'art_gallery', 'pottery_ceramics', 'candles_scents', 'stationery', 'photography'] },
  { key: 'electronics_tech', subSubjects: ['computers_laptops', 'mobile_phones', 'audio_video', 'gaming', 'smart_home'] },
  { key: 'pets', subSubjects: ['pet_food', 'pet_accessories', 'grooming', 'veterinary'] },
  { key: 'books_education', subSubjects: ['bookstore', 'stationery_office', 'educational_supplies', 'music_instruments'] },
  { key: 'sports_outdoors', subSubjects: ['sports_equipment', 'outdoor_gear', 'fitness', 'cycling', 'camping'] },
  { key: 'services', subSubjects: ['cleaning', 'repair_maintenance', 'tutoring', 'event_planning', 'personal_training', 'photography_services'] },
  { key: 'grocery_market', subSubjects: ['supermarket', 'organic_market', 'specialty_foods', 'deli', 'butcher', 'fishmonger', 'wine_spirits'] },
];

export const STORE_CATEGORY_SUBJECT_KEYS = STORE_CATEGORIES.map(c => c.key);

export const STORE_CATEGORY_MAP: Record<string, readonly string[]> = Object.fromEntries(
  STORE_CATEGORIES.map(c => [c.key, c.subSubjects]),
);

export const ALL_SUB_SUBJECT_KEYS = new Set(STORE_CATEGORIES.flatMap(c => c.subSubjects));
