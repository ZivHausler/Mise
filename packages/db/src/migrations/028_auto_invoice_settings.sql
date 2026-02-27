ALTER TABLE stores ADD COLUMN auto_generate_invoice BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE stores ADD COLUMN auto_generate_credit_note BOOLEAN NOT NULL DEFAULT false;
