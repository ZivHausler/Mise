-- Migration 005: Add package_size column to ingredients
ALTER TABLE ingredients ADD COLUMN package_size DECIMAL(12,4);
