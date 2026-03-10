-- Plan names are handled by frontend i18n (translation keys based on slug).
-- No need for per-language columns in the DB.
ALTER TABLE plans DROP COLUMN name_he;
