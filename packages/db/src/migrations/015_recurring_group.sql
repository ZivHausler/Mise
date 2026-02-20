-- Add recurring_group_id to link orders created as a recurring batch
ALTER TABLE orders ADD COLUMN IF NOT EXISTS recurring_group_id UUID;
CREATE INDEX IF NOT EXISTS idx_orders_recurring_group ON orders(recurring_group_id) WHERE recurring_group_id IS NOT NULL;
