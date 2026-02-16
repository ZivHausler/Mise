-- Create a sequence starting at 100000001 (guarantees 9 digits)
CREATE SEQUENCE IF NOT EXISTS order_number_seq START WITH 100000001;

-- Add order_number column with default from the sequence
ALTER TABLE orders ADD COLUMN order_number BIGINT NOT NULL DEFAULT nextval('order_number_seq');

-- Create unique index
CREATE UNIQUE INDEX idx_orders_order_number ON orders (order_number);
