-- 1. Add billing anchor day (1-31) to store_subscriptions
ALTER TABLE store_subscriptions
  ADD COLUMN billing_anchor_day INTEGER CHECK (billing_anchor_day BETWEEN 1 AND 31);

-- 2. Payment records table (amounts in agorot = NIS * 100)
CREATE TABLE subscription_payments (
  id              SERIAL PRIMARY KEY,
  store_id        INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  subscription_id INTEGER NOT NULL REFERENCES store_subscriptions(id) ON DELETE CASCADE,
  amount_agorot   INTEGER NOT NULL CHECK (amount_agorot >= 0),
  type            SMALLINT NOT NULL,    -- 0=full, 1=proration, 2=refund
  description     VARCHAR(255),
  from_plan_id    INTEGER REFERENCES plans(id),
  to_plan_id      INTEGER REFERENCES plans(id),
  proration_days  INTEGER,
  period_days     INTEGER,
  status          SMALLINT NOT NULL DEFAULT 1,  -- 0=pending, 1=succeeded, 2=failed
  external_ref    VARCHAR(255),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_sub_payments_store ON subscription_payments(store_id, created_at DESC);
CREATE INDEX idx_sub_payments_sub ON subscription_payments(subscription_id);

-- 3. Expand event_type constraint to include new types
ALTER TABLE subscription_events
  DROP CONSTRAINT subscription_events_event_type_check;
ALTER TABLE subscription_events
  ADD CONSTRAINT subscription_events_event_type_check
  CHECK (event_type IN (
    'created','upgraded','downgraded','canceled','renewed',
    'trial_started','trial_expired',
    'payment_succeeded','payment_failed',
    'downgrade_scheduled','downgrade_canceled','pending_plan_changed'
  ));
