-- 1. Denormalized balance on customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS loyalty_points INTEGER NOT NULL DEFAULT 0;

-- 2. Per-store loyalty configuration
CREATE TABLE IF NOT EXISTS loyalty_config (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL UNIQUE REFERENCES stores(id) ON DELETE CASCADE,
  is_active       BOOLEAN NOT NULL DEFAULT false,
  points_per_shekel NUMERIC(10,4) NOT NULL DEFAULT 1.0,
  point_value     NUMERIC(10,6) NOT NULL DEFAULT 0.10,
  min_redeem_points INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Append-only transaction ledger
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_id   UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  payment_id    UUID REFERENCES payments(id) ON DELETE SET NULL,
  type          VARCHAR(20) NOT NULL CHECK (type IN ('earned','redeemed','adjusted')),
  points        INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_tx_customer   ON loyalty_transactions(customer_id, store_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_tx_payment    ON loyalty_transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_tx_created_at ON loyalty_transactions(created_at DESC);
