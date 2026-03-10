-- Plans table: static tier definitions
CREATE TABLE plans (
  id          SERIAL PRIMARY KEY,
  slug        VARCHAR(20) NOT NULL UNIQUE,
  name        VARCHAR(50) NOT NULL,
  name_he     VARCHAR(50) NOT NULL,
  price_nis   INTEGER NOT NULL DEFAULT 0,
  features    JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed plans
INSERT INTO plans (slug, name, name_he, price_nis, features, sort_order) VALUES
  ('free',  'Free',  'חינם',  0,  '["inventory", "recipes", "general_settings", "team_settings"]'::jsonb, 0),
  ('basic', 'Basic', 'בסיסי', 49, '["inventory", "recipes", "general_settings", "team_settings", "dashboard", "customers", "orders", "payments", "invoices", "notifications"]'::jsonb, 1),
  ('pro',   'Pro',   'מקצועי', 99, '["inventory", "recipes", "general_settings", "team_settings", "dashboard", "customers", "orders", "payments", "invoices", "notifications", "production", "loyalty", "loyalty_enhancements", "whatsapp", "sms", "ai_chat", "receipt_scanner"]'::jsonb, 2);

-- Store subscriptions: per-store subscription state
CREATE TABLE store_subscriptions (
  id                   SERIAL PRIMARY KEY,
  store_id             INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  plan_id              INTEGER NOT NULL REFERENCES plans(id),
  status               VARCHAR(20) NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active', 'trialing', 'canceled', 'past_due', 'expired')),
  trial_ends_at        TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end   TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days',
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  downgrade_to_plan_id INTEGER REFERENCES plans(id),
  payment_method       VARCHAR(50),
  external_id          VARCHAR(255),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one active/trialing subscription per store
CREATE UNIQUE INDEX idx_store_sub_active ON store_subscriptions (store_id) WHERE status IN ('active', 'trialing');

-- Subscription events: audit trail
CREATE TABLE subscription_events (
  id              SERIAL PRIMARY KEY,
  store_id        INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  subscription_id INTEGER REFERENCES store_subscriptions(id) ON DELETE SET NULL,
  event_type      VARCHAR(30) NOT NULL
                  CHECK (event_type IN ('created', 'upgraded', 'downgraded', 'canceled', 'renewed', 'trial_started', 'trial_expired', 'payment_succeeded', 'payment_failed')),
  from_plan_id    INTEGER REFERENCES plans(id),
  to_plan_id      INTEGER REFERENCES plans(id),
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sub_events_store ON subscription_events (store_id, created_at DESC);

-- Backfill: all existing stores get Free tier subscription
INSERT INTO store_subscriptions (store_id, plan_id, status, current_period_start, current_period_end)
SELECT s.id, p.id, 'active', NOW(), NOW() + INTERVAL '100 years'
FROM stores s
CROSS JOIN plans p
WHERE p.slug = 'free'
  AND NOT EXISTS (
    SELECT 1 FROM store_subscriptions ss
    WHERE ss.store_id = s.id AND ss.status IN ('active', 'trialing')
  );
