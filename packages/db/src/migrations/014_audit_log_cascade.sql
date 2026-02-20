-- Add ON DELETE CASCADE to admin_audit_log FKs so deleting a user or store
-- automatically removes their audit log entries (and body tables cascade from there).
ALTER TABLE admin_audit_log DROP CONSTRAINT admin_audit_log_user_id_fkey;
ALTER TABLE admin_audit_log
  ADD CONSTRAINT admin_audit_log_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE admin_audit_log DROP CONSTRAINT admin_audit_log_store_id_fkey;
ALTER TABLE admin_audit_log
  ADD CONSTRAINT admin_audit_log_store_id_fkey
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
