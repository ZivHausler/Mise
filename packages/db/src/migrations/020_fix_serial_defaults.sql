-- Migration 020: Fix serial column defaults after UUID-to-serial migration
-- Ensures all id columns have proper DEFAULT nextval(...) and NOT NULL constraints
-- This is idempotent and safe to re-run

DO $$
DECLARE
  tables TEXT[] := ARRAY[
    'users', 'stores', 'customers', 'ingredients', 'inventory_log',
    'orders', 'payments', 'unit_categories', 'units', 'groups',
    'notification_preferences', 'store_invitations', 'admin_audit_log',
    'loyalty_config', 'loyalty_transactions', 'production_batches',
    'batch_orders', 'batch_prep_items'
  ];
  t TEXT;
  seq_name TEXT;
  max_id INTEGER;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    seq_name := t || '_id_seq';

    -- Create sequence if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = seq_name) THEN
      EXECUTE format('CREATE SEQUENCE %I OWNED BY %I.id', seq_name, t);
    END IF;

    -- Get current max id
    EXECUTE format('SELECT COALESCE(MAX(id), 0) FROM %I', t) INTO max_id;

    -- Set sequence value
    IF max_id > 0 THEN
      PERFORM setval(seq_name, max_id, true);
    ELSE
      PERFORM setval(seq_name, 1, false);
    END IF;

    -- Set default and not null
    EXECUTE format('ALTER TABLE %I ALTER COLUMN id SET DEFAULT nextval(%L)', t, seq_name);
    EXECUTE format('ALTER TABLE %I ALTER COLUMN id SET NOT NULL', t);
  END LOOP;
END $$;
