-- Add branding fields to stores table
ALTER TABLE stores
  ADD COLUMN logo_url TEXT,
  ADD COLUMN banner_url TEXT,
  ADD COLUMN description TEXT;

-- Add length constraint on description
ALTER TABLE stores
  ADD CONSTRAINT stores_description_max_length CHECK (char_length(description) <= 500);
