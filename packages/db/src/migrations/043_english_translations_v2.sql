-- Add additional English translation columns

-- Stores: name_en (if not already added by 042), address_en
ALTER TABLE stores ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS address_en TEXT;

-- Ingredients: name_en
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);
