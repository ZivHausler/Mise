-- Add toggle for whether the store theme should affect the mobile app
ALTER TABLE stores
  ADD COLUMN apply_theme_to_app BOOLEAN NOT NULL DEFAULT true;
