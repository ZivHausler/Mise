-- 008_stores.sql: Multi-tenant store system
-- New tables: stores, users_stores, store_invitations
-- Add store_id to existing tables, remove old role/user_id columns

-- ─── New Tables ─────────────────────────────────────────────────────────────

CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users_stores (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  role INTEGER NOT NULL DEFAULT 3 CHECK (role IN (1, 2, 3)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, store_id)
);

CREATE TABLE store_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role INTEGER NOT NULL DEFAULT 3 CHECK (role IN (2, 3)),
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Add store_id to existing tables ────────────────────────────────────────

ALTER TABLE customers ADD COLUMN store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE ingredients ADD COLUMN store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE orders ADD COLUMN store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE allergens ADD COLUMN store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE units ADD COLUMN store_id UUID REFERENCES stores(id) ON DELETE CASCADE;

-- ─── Remove old role column from users, user_id from allergens/units ────────

ALTER TABLE users DROP COLUMN IF EXISTS role;
ALTER TABLE allergens DROP COLUMN IF EXISTS user_id;
ALTER TABLE units DROP COLUMN IF EXISTS user_id;

-- ─── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX idx_users_stores_store ON users_stores(store_id);
CREATE INDEX idx_customers_store ON customers(store_id);
CREATE INDEX idx_ingredients_store ON ingredients(store_id);
CREATE INDEX idx_orders_store ON orders(store_id);
CREATE INDEX idx_allergens_store ON allergens(store_id);
CREATE INDEX idx_units_store ON units(store_id);
CREATE INDEX idx_store_invitations_token ON store_invitations(token);
CREATE INDEX idx_store_invitations_email ON store_invitations(email);

-- ─── Clean up existing data (no store_id = orphaned) ────────────────────────
-- These rows can't be associated with any store, so remove them.

DELETE FROM payments WHERE order_id IN (SELECT id FROM orders WHERE store_id IS NULL);
DELETE FROM inventory_log WHERE ingredient_id IN (SELECT id FROM ingredients WHERE store_id IS NULL);
DELETE FROM ingredient_allergens WHERE ingredient_id IN (SELECT id FROM ingredients WHERE store_id IS NULL);
DELETE FROM orders WHERE store_id IS NULL;
DELETE FROM customers WHERE store_id IS NULL;
DELETE FROM ingredients WHERE store_id IS NULL;
DELETE FROM allergens WHERE is_default = false AND store_id IS NULL;
DELETE FROM units WHERE is_default = false AND store_id IS NULL;
