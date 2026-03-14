-- Add English translation columns for customer-facing text

-- Stores: name_en, description_en
ALTER TABLE stores ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS description_en TEXT;

-- Recipe categories: name_en
ALTER TABLE recipe_categories ADD COLUMN IF NOT EXISTS name_en VARCHAR(100);

-- Allergens: name_en
ALTER TABLE allergens ADD COLUMN IF NOT EXISTS name_en VARCHAR(200);

-- Update default allergens with English names
UPDATE allergens SET name_en = 'Dairy' WHERE is_default = true AND name = 'חלבי';
UPDATE allergens SET name_en = 'Gluten' WHERE is_default = true AND name = 'גלוטן';
UPDATE allergens SET name_en = 'Nuts' WHERE is_default = true AND name = 'אגוזים';
-- For allergens already stored in English, copy name to name_en
UPDATE allergens SET name_en = name WHERE is_default = true AND name_en IS NULL;
