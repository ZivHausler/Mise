-- Snapshot the order's display number on invoices
ALTER TABLE invoices ADD COLUMN order_number VARCHAR(30);

-- Backfill from orders table
UPDATE invoices SET order_number = o.order_number::text
FROM orders o WHERE invoices.order_id = o.id;
