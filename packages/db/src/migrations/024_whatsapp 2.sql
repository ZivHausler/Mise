-- Add WhatsApp preference column
ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS channel_whatsapp BOOLEAN NOT NULL DEFAULT false;

-- WhatsApp Business per-store configuration
CREATE TABLE IF NOT EXISTS whatsapp_config (
  id            SERIAL PRIMARY KEY,
  store_id      INTEGER NOT NULL UNIQUE REFERENCES stores(id) ON DELETE CASCADE,
  phone_number_id   TEXT NOT NULL,
  access_token      TEXT NOT NULL,
  business_account_id TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
