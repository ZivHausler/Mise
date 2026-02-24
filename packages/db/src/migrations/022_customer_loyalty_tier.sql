ALTER TABLE customers ADD COLUMN loyalty_tier TEXT NOT NULL DEFAULT 'bronze'
  CHECK (loyalty_tier IN ('bronze', 'silver', 'gold'));
