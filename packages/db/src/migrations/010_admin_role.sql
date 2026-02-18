-- Add system admin flag to users
ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Partial index: fast lookup for admin users
CREATE INDEX idx_users_is_admin ON users (is_admin) WHERE is_admin = TRUE;

-- Audit log for admin actions
CREATE TABLE admin_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  store_id    UUID REFERENCES stores(id),
  method      VARCHAR(10) NOT NULL,
  path        TEXT NOT NULL,
  status_code INTEGER,
  ip          VARCHAR(45),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_audit_log_user_id ON admin_audit_log(user_id);
CREATE INDEX idx_admin_audit_log_created_at ON admin_audit_log(created_at);
