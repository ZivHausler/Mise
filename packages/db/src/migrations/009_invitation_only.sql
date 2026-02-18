-- Make store_invitations.store_id nullable (NULL = create-store invite)
ALTER TABLE store_invitations ALTER COLUMN store_id DROP NOT NULL;

-- Expand role CHECK to allow OWNER (1)
ALTER TABLE store_invitations DROP CONSTRAINT IF EXISTS store_invitations_role_check;
ALTER TABLE store_invitations ADD CONSTRAINT store_invitations_role_check CHECK (role IN (1, 2, 3));

-- Invariant: NULL store_id requires role=1 (OWNER), non-NULL requires role IN (2,3)
ALTER TABLE store_invitations ADD CONSTRAINT store_invitations_type_check
  CHECK ((store_id IS NULL AND role = 1) OR (store_id IS NOT NULL AND role IN (2, 3)));
