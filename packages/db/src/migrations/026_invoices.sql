-- Add business fields to stores
ALTER TABLE stores ADD COLUMN phone VARCHAR(50);
ALTER TABLE stores ADD COLUMN email VARCHAR(255);
ALTER TABLE stores ADD COLUMN tax_number VARCHAR(50);
ALTER TABLE stores ADD COLUMN vat_rate DECIMAL(5,2) NOT NULL DEFAULT 18.00;

-- Invoice counters for gapless per-store numbering
CREATE TABLE invoice_counters (
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  counter_type VARCHAR(20) NOT NULL CHECK (counter_type IN ('invoice', 'credit_note')),
  last_number INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (store_id, counter_type)
);

-- Invoices table
CREATE TABLE invoices (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  type VARCHAR(20) NOT NULL CHECK (type IN ('invoice', 'credit_note')),
  invoice_number INTEGER NOT NULL,
  display_number VARCHAR(30) NOT NULL,
  original_invoice_id INTEGER REFERENCES invoices(id) ON DELETE RESTRICT,

  -- Customer snapshot
  customer_id INTEGER,
  customer_name VARCHAR(255),
  customer_address TEXT,
  customer_phone VARCHAR(50),
  customer_email VARCHAR(255),

  -- Store snapshot
  store_name VARCHAR(255),
  store_address TEXT,
  store_phone VARCHAR(50),
  store_email VARCHAR(255),
  store_tax_number VARCHAR(50),

  -- Financial
  subtotal DECIMAL(12,2) NOT NULL,
  vat_rate DECIMAL(5,2) NOT NULL,
  vat_amount DECIMAL(12,2) NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,

  -- Items snapshot
  items JSONB NOT NULL DEFAULT '[]',

  -- Metadata
  notes TEXT,
  allocation_number VARCHAR(20),
  issued_by INTEGER REFERENCES users(id),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_invoices_store_type_number UNIQUE (store_id, type, invoice_number)
);

-- Indexes
CREATE INDEX idx_invoices_store_id ON invoices (store_id);
CREATE INDEX idx_invoices_order_id ON invoices (order_id);
CREATE INDEX idx_invoices_store_customer ON invoices (store_id, customer_id);
CREATE INDEX idx_invoices_store_issued_at ON invoices (store_id, issued_at DESC);
CREATE INDEX idx_invoices_store_type ON invoices (store_id, type);
CREATE INDEX idx_invoices_original_invoice ON invoices (original_invoice_id) WHERE original_invoice_id IS NOT NULL;

-- Initialize counters for existing stores
INSERT INTO invoice_counters (store_id, counter_type, last_number)
SELECT id, 'invoice', 0 FROM stores ON CONFLICT DO NOTHING;
INSERT INTO invoice_counters (store_id, counter_type, last_number)
SELECT id, 'credit_note', 0 FROM stores ON CONFLICT DO NOTHING;
