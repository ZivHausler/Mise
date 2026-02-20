-- Migration 017: Production batches for Kitchen Display System (KDS)
-- Tracks aggregated production batches through bakery workflow stages

-- Stage enum (integer):
-- 0=to_prep, 1=mixing, 2=proofing, 3=baking, 4=cooling, 5=ready, 6=packaged

CREATE TABLE IF NOT EXISTS production_batches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  recipe_id       VARCHAR(100) NOT NULL,
  recipe_name     VARCHAR(255) NOT NULL DEFAULT '',
  quantity        INTEGER NOT NULL DEFAULT 1,
  stage           INTEGER NOT NULL DEFAULT 0 CHECK (stage BETWEEN 0 AND 6),
  production_date DATE NOT NULL,
  priority        INTEGER NOT NULL DEFAULT 0,
  assigned_to     VARCHAR(255),
  source          VARCHAR(10) NOT NULL DEFAULT 'manual' CHECK (source IN ('auto', 'manual')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_production_batches_store_date ON production_batches(store_id, production_date);
CREATE INDEX IF NOT EXISTS idx_production_batches_store_stage ON production_batches(store_id, stage);

-- Junction table linking batches to source orders
CREATE TABLE IF NOT EXISTS batch_orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id            UUID NOT NULL REFERENCES production_batches(id) ON DELETE CASCADE,
  order_id            UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_item_index    INTEGER NOT NULL DEFAULT 0,
  quantity_from_order INTEGER NOT NULL DEFAULT 1,
  store_id            UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_batch_orders_batch ON batch_orders(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_orders_order ON batch_orders(order_id);

-- Per-batch ingredient checklist
CREATE TABLE IF NOT EXISTS batch_prep_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id          UUID NOT NULL REFERENCES production_batches(id) ON DELETE CASCADE,
  ingredient_id     UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  ingredient_name   VARCHAR(255) NOT NULL DEFAULT '',
  required_quantity DECIMAL(12,4) NOT NULL DEFAULT 0,
  unit              VARCHAR(50) NOT NULL DEFAULT '',
  is_prepped        BOOLEAN NOT NULL DEFAULT false,
  store_id          UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_batch_prep_items_batch ON batch_prep_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_prep_items_store_date ON batch_prep_items(store_id);
