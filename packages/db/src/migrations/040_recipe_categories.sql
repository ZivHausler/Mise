CREATE TABLE IF NOT EXISTS recipe_categories (
  id SERIAL PRIMARY KEY,
  store_id INT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_recipe_categories_store_name UNIQUE (store_id, name)
);
CREATE INDEX IF NOT EXISTS idx_recipe_categories_store ON recipe_categories(store_id);
