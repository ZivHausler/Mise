-- Migration 003: Default allergens with icons
-- Adds is_default flag and icon to allergens, seeds common food allergens

-- Allow NULL user_id for system-wide default allergens (same pattern as units)
ALTER TABLE allergens ALTER COLUMN user_id DROP NOT NULL;

-- Add new columns
ALTER TABLE allergens ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE allergens ADD COLUMN IF NOT EXISTS icon VARCHAR(50);

-- Seed default allergens (user_id=NULL, is_default=true)
INSERT INTO allergens (user_id, name, color, icon, is_default) VALUES
  (NULL, 'Dairy',  '#3B82F6', 'Milk',  true),
  (NULL, 'Gluten', '#EAB308', 'Wheat', true),
  (NULL, 'Nuts',   '#F97316', 'Nut',   true)
ON CONFLICT DO NOTHING;
