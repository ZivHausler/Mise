-- Migration 021: Rename "groups" to "allergens"
-- Renames tables, columns, constraints, and indexes to reflect the new domain term.
-- Idempotent: uses IF EXISTS so it's safe to re-run.

BEGIN;

-- Rename tables
ALTER TABLE IF EXISTS groups RENAME TO allergens;
ALTER TABLE IF EXISTS ingredient_groups RENAME TO ingredient_allergens;

-- Rename column
ALTER TABLE IF EXISTS ingredient_allergens RENAME COLUMN group_id TO allergen_id;

-- Rename constraints
ALTER INDEX IF EXISTS idx_groups_store RENAME TO idx_allergens_store;
ALTER INDEX IF EXISTS idx_ingredient_groups_group RENAME TO idx_ingredient_allergens_allergen;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'groups_store_id_fkey') THEN
    ALTER TABLE allergens RENAME CONSTRAINT groups_store_id_fkey TO allergens_store_id_fkey;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ingredient_groups_ingredient_id_fkey') THEN
    ALTER TABLE ingredient_allergens RENAME CONSTRAINT ingredient_groups_ingredient_id_fkey TO ingredient_allergens_ingredient_id_fkey;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ingredient_groups_group_id_fkey') THEN
    ALTER TABLE ingredient_allergens RENAME CONSTRAINT ingredient_groups_group_id_fkey TO ingredient_allergens_allergen_id_fkey;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_groups_store_name') THEN
    ALTER TABLE allergens RENAME CONSTRAINT uq_groups_store_name TO uq_allergens_store_name;
  END IF;
END $$;

-- Rename sequence
ALTER SEQUENCE IF EXISTS groups_id_seq RENAME TO allergens_id_seq;

COMMIT;
