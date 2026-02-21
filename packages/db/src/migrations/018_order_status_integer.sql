-- Convert orders.status from VARCHAR to INTEGER
-- Maps legacy string values and numeric string values to integers:
--   'received'   / '0' -> 0
--   'in_progress'/ '1' -> 1
--   'ready'      / '2' -> 2
--   'delivered'  / '3' -> 3

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

UPDATE orders SET status = '0' WHERE status = 'received';
UPDATE orders SET status = '1' WHERE status = 'in_progress';
UPDATE orders SET status = '2' WHERE status = 'ready';
UPDATE orders SET status = '3' WHERE status = 'delivered';

ALTER TABLE orders ALTER COLUMN status TYPE INTEGER USING status::integer;
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 0;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN (0, 1, 2, 3));
