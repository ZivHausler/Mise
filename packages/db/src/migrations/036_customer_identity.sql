-- 036_customer_identity.sql
-- Normalize customer identity: rename CRM table, create global identity table, link them.

BEGIN;

-- ============================================================
-- 1. Rename existing CRM table: customers -> customer_stores
-- ============================================================
-- PostgreSQL automatically updates FKs referencing this table (orders.customer_id, etc.)
ALTER TABLE customers RENAME TO customer_stores;

-- Rename primary key index for clarity
ALTER INDEX IF EXISTS customers_pkey RENAME TO customer_stores_pkey;

-- Rename sequence for clarity
ALTER SEQUENCE IF EXISTS customers_id_seq RENAME TO customer_stores_id_seq;

-- Rename existing indexes to avoid name conflicts with the new customers table
ALTER INDEX IF EXISTS idx_customers_email RENAME TO idx_customer_stores_email;
ALTER INDEX IF EXISTS idx_customers_name RENAME TO idx_customer_stores_name;
ALTER INDEX IF EXISTS idx_customers_store RENAME TO idx_customer_stores_store;

-- ============================================================
-- 2. Create global customer identity table
-- ============================================================
CREATE TABLE customers (
  id          SERIAL PRIMARY KEY,
  google_id   VARCHAR(255) UNIQUE NOT NULL,
  email       VARCHAR(255) NOT NULL,
  name        VARCHAR(255),
  photo       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_email ON customers(email);

-- ============================================================
-- 3. Add customer_id FK to customer_stores (nullable)
-- ============================================================
-- Nullable because store owners can create CRM-only entries without a Google identity
ALTER TABLE customer_stores
  ADD COLUMN customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL;

-- One global customer per store
CREATE UNIQUE INDEX idx_customer_stores_customer_store
  ON customer_stores(customer_id, store_id)
  WHERE customer_id IS NOT NULL;

COMMIT;
