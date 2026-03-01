-- Migration 028: Loyalty enhancements — customer segments + birthday reminders

-- 1. Add birthday column to customers (year fixed to 2000 for leap-year safety)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS birthday DATE;

-- 2. Add segmentation threshold columns to loyalty_config
ALTER TABLE loyalty_config
  ADD COLUMN IF NOT EXISTS segment_vip_order_count INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS segment_vip_days INTEGER NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS segment_regular_order_count INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS segment_regular_days INTEGER NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS segment_new_days INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS segment_dormant_days INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS birthday_reminder_days INTEGER NOT NULL DEFAULT 7;

-- 3. Index for fast order-count-per-customer lookups used by segmentation CTE
CREATE INDEX IF NOT EXISTS idx_orders_customer_store_created
  ON orders (store_id, customer_id, created_at DESC);

-- 4. Index for birthday month/day lookups
CREATE INDEX IF NOT EXISTS idx_customers_birthday_mmdd
  ON customers ((EXTRACT(MONTH FROM birthday)), (EXTRACT(DAY FROM birthday)));
