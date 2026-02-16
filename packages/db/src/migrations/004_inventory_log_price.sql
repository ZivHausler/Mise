-- Add price_paid column to inventory_log for tracking purchase prices
ALTER TABLE inventory_log ADD COLUMN IF NOT EXISTS price_paid DECIMAL(12,4);
