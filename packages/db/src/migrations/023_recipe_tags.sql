CREATE TABLE IF NOT EXISTS recipe_tags (
  id SERIAL PRIMARY KEY,
  store_id INT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_recipe_tags_store_name UNIQUE (store_id, name)
);
CREATE INDEX IF NOT EXISTS idx_recipe_tags_store ON recipe_tags(store_id);
