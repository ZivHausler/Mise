-- 032_payment_integration.sql
-- Adds checkout sessions, payment provider fields, and expanded event types
-- for PayPlus and PayPal payment integration.

-- 1. Checkout sessions table (tracks async payment flow)
CREATE TABLE checkout_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  action          VARCHAR(20) NOT NULL CHECK (action IN ('upgrade', 'renewal_recovery', 'payment_method_update')),
  target_plan_id  INTEGER REFERENCES plans(id),
  from_plan_id    INTEGER REFERENCES plans(id),
  amount_agorot   INTEGER NOT NULL CHECK (amount_agorot >= 0),
  is_proration    BOOLEAN NOT NULL DEFAULT false,
  proration_days  INTEGER,
  period_days     INTEGER,
  provider        VARCHAR(20) NOT NULL CHECK (provider IN ('payplus', 'paypal')),
  provider_page_url    TEXT,
  provider_session_id  VARCHAR(255),
  status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'completed', 'failed', 'expired', 'canceled')),
  actor_user_id   INTEGER NOT NULL REFERENCES users(id),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 minutes',
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_checkout_sessions_store ON checkout_sessions (store_id, status);
CREATE INDEX idx_checkout_sessions_provider ON checkout_sessions (provider_session_id);
CREATE INDEX idx_checkout_sessions_expires ON checkout_sessions (status, expires_at) WHERE status = 'pending';

-- 2. Add payment provider fields to store_subscriptions
ALTER TABLE store_subscriptions
  ADD COLUMN payment_provider VARCHAR(20) CHECK (payment_provider IN ('payplus', 'paypal')),
  ADD COLUMN provider_subscription_id VARCHAR(255),
  ADD COLUMN grace_period_end TIMESTAMPTZ,
  ADD COLUMN payment_failed_count SMALLINT NOT NULL DEFAULT 0;

-- 3. Add provider fields to subscription_payments
ALTER TABLE subscription_payments
  ADD COLUMN checkout_session_id UUID REFERENCES checkout_sessions(id),
  ADD COLUMN provider_transaction_id VARCHAR(255);

-- 4. Expand event_type constraint for payment events
ALTER TABLE subscription_events
  DROP CONSTRAINT subscription_events_event_type_check;
ALTER TABLE subscription_events
  ADD CONSTRAINT subscription_events_event_type_check
  CHECK (event_type IN (
    'created','upgraded','downgraded','canceled','renewed',
    'trial_started','trial_expired',
    'payment_succeeded','payment_failed',
    'downgrade_scheduled','downgrade_canceled','pending_plan_changed',
    'trial_reminder_3d','trial_reminder_1d','trial_reminder_0d',
    'checkout_initiated','checkout_completed','checkout_failed','checkout_expired',
    'renewal_charge_failed','renewal_recovery_succeeded',
    'grace_period_started','grace_period_expired',
    'auto_downgraded_payment_failed'
  ));
