-- Migration 003: Default groups with icons
-- Adds is_default flag and icon to groups, seeds common food groups

-- Allow NULL user_id for system-wide default groups (same pattern as units)
ALTER TABLE groups ALTER COLUMN user_id DROP NOT NULL;

-- Add new columns
ALTER TABLE groups ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS icon VARCHAR(50);

-- Seed default groups (user_id=NULL, is_default=true)
INSERT INTO groups (user_id, name, color, icon, is_default) VALUES
  (NULL, 'Dairy',  '#3B82F6', 'Milk',  true),
  (NULL, 'Gluten', '#EAB308', 'Wheat', true),
  (NULL, 'Nuts',   '#F97316', 'Nut',   true)
ON CONFLICT DO NOTHING;
