-- 034_storefront.sql: Storefront support — store slugs, storefront toggle, paypal payment method

-- 1. Add slug and storefront_enabled to stores
ALTER TABLE stores
  ADD COLUMN slug VARCHAR(100),
  ADD COLUMN storefront_enabled BOOLEAN NOT NULL DEFAULT false;

-- 2. Backfill slugs from existing store names
-- Slugify: lowercase, strip non-ASCII, replace spaces with hyphens, collapse hyphens, append store id.
UPDATE stores SET slug = CONCAT(
  LOWER(REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(name, '[^a-zA-Z0-9\s-]', '', 'g'),  -- strip non-ASCII
      '\s+', '-', 'g'                                       -- spaces to hyphens
    ),
    '-{2,}', '-', 'g'                                       -- collapse multiple hyphens
  )),
  '-', id
)
WHERE slug IS NULL;

-- For rows that ended up with empty prefix (e.g., pure Hebrew names), use 'store-{id}'
UPDATE stores SET slug = CONCAT('store-', id)
WHERE slug IS NULL OR slug = '' OR slug = CONCAT('-', id);

-- 3. Now make slug NOT NULL and UNIQUE
ALTER TABLE stores ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX idx_stores_slug ON stores (slug);

-- 4. Add 'paypal' to the payments.method CHECK constraint
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_method_check;
ALTER TABLE payments ADD CONSTRAINT payments_method_check CHECK (method IN ('cash', 'credit_card', 'paypal'));

-- 5. Add optional reference column to payments for external transaction IDs
ALTER TABLE payments ADD COLUMN IF NOT EXISTS reference VARCHAR(255);
