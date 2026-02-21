-- Migration 020: Fix serial column defaults after UUID-to-serial migration
-- Ensures all id columns have proper DEFAULT nextval(...) and NOT NULL constraints
-- Also backfills any NULL ids from existing rows
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
  null_count INTEGER;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    seq_name := t || '_id_seq';

    -- Create sequence if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = seq_name) THEN
      EXECUTE format('CREATE SEQUENCE %I OWNED BY %I.id', seq_name, t);
    END IF;

    -- Set default first (so new inserts work immediately)
    EXECUTE format('ALTER TABLE %I ALTER COLUMN id SET DEFAULT nextval(%L)', t, seq_name);

    -- Get current max non-null id
    EXECUTE format('SELECT COALESCE(MAX(id), 0) FROM %I', t) INTO max_id;

    -- Set sequence value past the current max
    IF max_id > 0 THEN
      PERFORM setval(seq_name, max_id, true);
    ELSE
      PERFORM setval(seq_name, 1, false);
    END IF;

    -- Backfill any NULL ids using the sequence
    EXECUTE format('SELECT COUNT(*) FROM %I WHERE id IS NULL', t) INTO null_count;
    IF null_count > 0 THEN
      EXECUTE format('UPDATE %I SET id = nextval(%L) WHERE id IS NULL', t, seq_name);
      RAISE NOTICE 'Backfilled % NULL ids in %', null_count, t;
    END IF;

    -- Now safe to set NOT NULL
    EXECUTE format('ALTER TABLE %I ALTER COLUMN id SET NOT NULL', t);
  END LOOP;
END $$;
