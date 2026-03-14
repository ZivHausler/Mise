-- Add dedicated trial plan (Pro features, no cost, hidden from users)
-- sort_order: free=0, trial=1, basic=2, pro=3

-- Shift existing sort_orders
UPDATE plans SET sort_order = 3 WHERE slug = 'pro' AND sort_order = 2;
UPDATE plans SET sort_order = 2 WHERE slug = 'basic' AND sort_order = 1;

-- Insert trial plan
INSERT INTO plans (slug, name, price_nis, features, sort_order, is_active)
VALUES ('trial', 'Trial', 0,
  '["inventory", "recipes", "general_settings", "team_settings", "dashboard", "customers", "orders", "payments", "invoices", "notifications", "production", "loyalty", "loyalty_enhancements", "whatsapp", "sms", "ai_chat", "receipt_scanner"]',
  1, true)
ON CONFLICT (slug) DO NOTHING;

-- Migrate existing trialing subscriptions from pro to trial
UPDATE store_subscriptions
SET plan_id = (SELECT id FROM plans WHERE slug = 'trial')
WHERE status = 'trialing'
  AND plan_id = (SELECT id FROM plans WHERE slug = 'pro');

-- Add trial_plan_selected to subscription_events event_type constraint
ALTER TABLE subscription_events DROP CONSTRAINT IF EXISTS subscription_events_event_type_check;
ALTER TABLE subscription_events ADD CONSTRAINT subscription_events_event_type_check CHECK (event_type IN ('created','upgraded','downgraded','canceled','renewed','trial_started','trial_expired','trial_plan_selected','payment_succeeded','payment_failed','downgrade_scheduled','downgrade_canceled','pending_plan_changed','trial_reminder_3d','trial_reminder_1d','trial_reminder_0d','checkout_initiated','checkout_completed','checkout_failed','checkout_expired','renewal_charge_failed','renewal_recovery_succeeded','grace_period_started','grace_period_expired','auto_downgraded_payment_failed'));
