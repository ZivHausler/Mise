-- 035_order_approval.sql: Order approval flow, cancellation support, notifications

-- 1. Shift existing order statuses by +1 to make room for PENDING_APPROVAL at 0
-- Old: 0=RECEIVED, 1=IN_PROGRESS, 2=READY, 3=DELIVERED
-- New: 0=PENDING_APPROVAL, 1=RECEIVED, 2=IN_PROGRESS, 3=READY, 4=DELIVERED, 5=CANCELLED, 6=CANCELLATION_REQUESTED
-- Must update in reverse order to avoid collisions (3→4, then 2→3, then 1→2, then 0→1)
UPDATE orders SET status = 4 WHERE status = 3;
UPDATE orders SET status = 3 WHERE status = 2;
UPDATE orders SET status = 2 WHERE status = 1;
UPDATE orders SET status = 1 WHERE status = 0;

-- 2. Widen status check constraint to allow new statuses (0-6)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status >= 0 AND status <= 6);

-- 3. Add new columns to orders table
ALTER TABLE orders
  ADD COLUMN source VARCHAR(20) NOT NULL DEFAULT 'web',
  ADD COLUMN cancellation_reason TEXT,
  ADD COLUMN previous_status INTEGER;

-- 3. Create order_notifications table
CREATE TABLE order_notifications (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  status_from INTEGER,
  status_to INTEGER NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_notifications_order ON order_notifications(order_id);
CREATE INDEX idx_order_notifications_store_read ON order_notifications(store_id, read);
CREATE INDEX idx_order_notifications_customer ON order_notifications(customer_id, read);

-- 4. Indexes for new query patterns
CREATE INDEX idx_orders_store_status ON orders(store_id, status);
CREATE INDEX idx_orders_source ON orders(store_id, source);
