-- Create request body table
CREATE TABLE admin_audit_log_request_body (
  audit_log_id UUID PRIMARY KEY REFERENCES admin_audit_log(id) ON DELETE CASCADE,
  body JSONB NOT NULL
);

-- Create response body table
CREATE TABLE admin_audit_log_response_body (
  audit_log_id UUID PRIMARY KEY REFERENCES admin_audit_log(id) ON DELETE CASCADE,
  body JSONB NOT NULL
);

-- Migrate existing data
INSERT INTO admin_audit_log_request_body (audit_log_id, body)
SELECT id, request_body FROM admin_audit_log WHERE request_body IS NOT NULL;

INSERT INTO admin_audit_log_response_body (audit_log_id, body)
SELECT id, response_body FROM admin_audit_log WHERE response_body IS NOT NULL;

-- Drop old columns
ALTER TABLE admin_audit_log DROP COLUMN IF EXISTS request_body;
ALTER TABLE admin_audit_log DROP COLUMN IF EXISTS response_body;
