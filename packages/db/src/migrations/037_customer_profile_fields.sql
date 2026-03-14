BEGIN;

-- 1. Add new columns (nullable)
ALTER TABLE customers
  ADD COLUMN first_name VARCHAR(255),
  ADD COLUMN last_name  VARCHAR(255),
  ADD COLUMN phone      VARCHAR(50);

-- 2. Backfill from existing name column
UPDATE customers SET
  first_name = CASE
    WHEN TRIM(name) = '' OR name IS NULL THEN NULL
    WHEN POSITION(' ' IN TRIM(name)) = 0 THEN TRIM(name)
    ELSE TRIM(SPLIT_PART(TRIM(name), ' ', 1))
  END,
  last_name = CASE
    WHEN TRIM(name) = '' OR name IS NULL THEN NULL
    WHEN POSITION(' ' IN TRIM(name)) = 0 THEN NULL
    ELSE TRIM(SUBSTRING(TRIM(name) FROM POSITION(' ' IN TRIM(name)) + 1))
  END;

-- 3. Drop old name column
ALTER TABLE customers DROP COLUMN name;

COMMIT;
