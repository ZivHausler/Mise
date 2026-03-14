ALTER TABLE stores ADD COLUMN category_subject TEXT DEFAULT NULL;
ALTER TABLE stores ADD COLUMN category_sub_subject TEXT DEFAULT NULL;

CREATE INDEX idx_stores_category ON stores (category_subject, category_sub_subject)
  WHERE category_subject IS NOT NULL;
