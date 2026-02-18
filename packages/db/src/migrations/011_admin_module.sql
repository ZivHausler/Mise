-- Add disabled_at to users (null = active, non-null = disabled with timestamp)
ALTER TABLE users ADD COLUMN disabled_at TIMESTAMPTZ;

-- Add revoked_at to store_invitations (for admin revocation)
ALTER TABLE store_invitations ADD COLUMN revoked_at TIMESTAMPTZ;

-- Indexes
CREATE INDEX idx_users_disabled_at ON users (disabled_at) WHERE disabled_at IS NOT NULL;
CREATE INDEX idx_store_invitations_revoked_at ON store_invitations (revoked_at) WHERE revoked_at IS NOT NULL;
