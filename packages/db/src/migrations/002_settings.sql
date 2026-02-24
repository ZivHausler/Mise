-- Migration 002: Settings — units, allergens, notification preferences
-- Adds phone to users, unit categories/units with conversion, allergens, notification prefs

-- Add phone to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- Unit categories for conversion system
CREATE TABLE IF NOT EXISTS unit_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO unit_categories (name) VALUES ('weight'), ('volume'), ('count')
ON CONFLICT DO NOTHING;

-- Units table
CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES unit_categories(id),
  name VARCHAR(100) NOT NULL,
  abbreviation VARCHAR(20) NOT NULL,
  conversion_factor DECIMAL(20,10) NOT NULL DEFAULT 1,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_units_user_abbrev UNIQUE (user_id, abbreviation)
);

CREATE INDEX IF NOT EXISTS idx_units_user ON units(user_id);
CREATE INDEX IF NOT EXISTS idx_units_category ON units(category_id);

-- Seed default units (user_id=NULL, is_default=true)
-- Weight (base: gram)
INSERT INTO units (user_id, category_id, name, abbreviation, conversion_factor, is_default)
  SELECT NULL, id, 'Gram', 'g', 1, true FROM unit_categories WHERE name = 'weight'
  ON CONFLICT DO NOTHING;
INSERT INTO units (user_id, category_id, name, abbreviation, conversion_factor, is_default)
  SELECT NULL, id, 'Kilogram', 'kg', 1000, true FROM unit_categories WHERE name = 'weight'
  ON CONFLICT DO NOTHING;

-- Volume (base: milliliter)
INSERT INTO units (user_id, category_id, name, abbreviation, conversion_factor, is_default)
  SELECT NULL, id, 'Milliliter', 'ml', 1, true FROM unit_categories WHERE name = 'volume'
  ON CONFLICT DO NOTHING;
INSERT INTO units (user_id, category_id, name, abbreviation, conversion_factor, is_default)
  SELECT NULL, id, 'Liter', 'l', 1000, true FROM unit_categories WHERE name = 'volume'
  ON CONFLICT DO NOTHING;

-- Count (base: piece)
INSERT INTO units (user_id, category_id, name, abbreviation, conversion_factor, is_default)
  SELECT NULL, id, 'Pieces', 'pcs', 1, true FROM unit_categories WHERE name = 'count'
  ON CONFLICT DO NOTHING;
INSERT INTO units (user_id, category_id, name, abbreviation, conversion_factor, is_default)
  SELECT NULL, id, 'Units', 'units', 1, true FROM unit_categories WHERE name = 'count'
  ON CONFLICT DO NOTHING;

-- Allergens table (dietary/allergen tags)
CREATE TABLE IF NOT EXISTS allergens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  color VARCHAR(7),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_allergens_user_name UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_allergens_user ON allergens(user_id);

-- Notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  channel_email BOOLEAN NOT NULL DEFAULT true,
  channel_push BOOLEAN NOT NULL DEFAULT false,
  channel_sms BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_notif_pref_user_event UNIQUE (user_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_notif_pref_user ON notification_preferences(user_id);

-- Link ingredients to allergens (many-to-many)
CREATE TABLE IF NOT EXISTS ingredient_allergens (
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  allergen_id UUID NOT NULL REFERENCES allergens(id) ON DELETE CASCADE,
  PRIMARY KEY (ingredient_id, allergen_id)
);
CREATE INDEX IF NOT EXISTS idx_ingredient_allergens_allergen ON ingredient_allergens(allergen_id);
