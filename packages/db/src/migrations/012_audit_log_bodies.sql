-- Store request/response payloads in admin audit log
ALTER TABLE admin_audit_log ADD COLUMN IF NOT EXISTS request_body JSONB;
ALTER TABLE admin_audit_log ADD COLUMN IF NOT EXISTS response_body JSONB;
