-- Migration 019: Convert all entity IDs from UUID to sequential integers (SERIAL)
-- Strategy: create mapping tables, drop FKs/PKs, convert columns, re-add constraints

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 1: Create temporary mapping tables (old UUID → new integer)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TEMP TABLE _map_users AS
  SELECT id AS old_id, ROW_NUMBER() OVER (ORDER BY created_at, id)::INTEGER AS new_id FROM users;

CREATE TEMP TABLE _map_stores AS
  SELECT id AS old_id, ROW_NUMBER() OVER (ORDER BY created_at, id)::INTEGER AS new_id FROM stores;

CREATE TEMP TABLE _map_customers AS
  SELECT id AS old_id, ROW_NUMBER() OVER (ORDER BY created_at, id)::INTEGER AS new_id FROM customers;

CREATE TEMP TABLE _map_ingredients AS
  SELECT id AS old_id, ROW_NUMBER() OVER (ORDER BY created_at, id)::INTEGER AS new_id FROM ingredients;

CREATE TEMP TABLE _map_inventory_log AS
  SELECT id AS old_id, ROW_NUMBER() OVER (ORDER BY created_at, id)::INTEGER AS new_id FROM inventory_log;

CREATE TEMP TABLE _map_orders AS
  SELECT id AS old_id, ROW_NUMBER() OVER (ORDER BY created_at, id)::INTEGER AS new_id FROM orders;

CREATE TEMP TABLE _map_payments AS
  SELECT id AS old_id, ROW_NUMBER() OVER (ORDER BY created_at, id)::INTEGER AS new_id FROM payments;

CREATE TEMP TABLE _map_unit_categories AS
  SELECT id AS old_id, ROW_NUMBER() OVER (ORDER BY created_at, id)::INTEGER AS new_id FROM unit_categories;

CREATE TEMP TABLE _map_units AS
  SELECT id AS old_id, ROW_NUMBER() OVER (ORDER BY created_at, id)::INTEGER AS new_id FROM units;

CREATE TEMP TABLE _map_groups AS
  SELECT id AS old_id, ROW_NUMBER() OVER (ORDER BY created_at, id)::INTEGER AS new_id FROM groups;

CREATE TEMP TABLE _map_notification_preferences AS
  SELECT id AS old_id, ROW_NUMBER() OVER (ORDER BY created_at, id)::INTEGER AS new_id FROM notification_preferences;

CREATE TEMP TABLE _map_store_invitations AS
  SELECT id AS old_id, ROW_NUMBER() OVER (ORDER BY created_at, id)::INTEGER AS new_id FROM store_invitations;

CREATE TEMP TABLE _map_admin_audit_log AS
  SELECT id AS old_id, ROW_NUMBER() OVER (ORDER BY created_at, id)::INTEGER AS new_id FROM admin_audit_log;

CREATE TEMP TABLE _map_loyalty_config AS
  SELECT id AS old_id, ROW_NUMBER() OVER (ORDER BY created_at, id)::INTEGER AS new_id FROM loyalty_config;

CREATE TEMP TABLE _map_loyalty_transactions AS
  SELECT id AS old_id, ROW_NUMBER() OVER (ORDER BY created_at, id)::INTEGER AS new_id FROM loyalty_transactions;

CREATE TEMP TABLE _map_production_batches AS
  SELECT id AS old_id, ROW_NUMBER() OVER (ORDER BY created_at, id)::INTEGER AS new_id FROM production_batches;

CREATE TEMP TABLE _map_batch_orders AS
  SELECT id AS old_id, ROW_NUMBER() OVER (ORDER BY created_at, id)::INTEGER AS new_id FROM batch_orders;

CREATE TEMP TABLE _map_batch_prep_items AS
  SELECT id AS old_id, ROW_NUMBER() OVER (ORDER BY created_at, id)::INTEGER AS new_id FROM batch_prep_items;

-- Map recurring_group_id (distinct UUIDs to sequential integers)
CREATE TEMP TABLE _map_recurring_group AS
  SELECT recurring_group_id AS old_id, ROW_NUMBER() OVER (ORDER BY MIN(created_at))::INTEGER AS new_id
  FROM orders
  WHERE recurring_group_id IS NOT NULL
  GROUP BY recurring_group_id;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 2: Drop ALL foreign key constraints (leaf tables first)
-- ═══════════════════════════════════════════════════════════════════════════════

-- batch_prep_items FKs
ALTER TABLE batch_prep_items DROP CONSTRAINT IF EXISTS batch_prep_items_batch_id_fkey;
ALTER TABLE batch_prep_items DROP CONSTRAINT IF EXISTS batch_prep_items_ingredient_id_fkey;
ALTER TABLE batch_prep_items DROP CONSTRAINT IF EXISTS batch_prep_items_store_id_fkey;

-- batch_orders FKs
ALTER TABLE batch_orders DROP CONSTRAINT IF EXISTS batch_orders_batch_id_fkey;
ALTER TABLE batch_orders DROP CONSTRAINT IF EXISTS batch_orders_order_id_fkey;
ALTER TABLE batch_orders DROP CONSTRAINT IF EXISTS batch_orders_store_id_fkey;

-- loyalty_transactions FKs
ALTER TABLE loyalty_transactions DROP CONSTRAINT IF EXISTS loyalty_transactions_store_id_fkey;
ALTER TABLE loyalty_transactions DROP CONSTRAINT IF EXISTS loyalty_transactions_customer_id_fkey;
ALTER TABLE loyalty_transactions DROP CONSTRAINT IF EXISTS loyalty_transactions_payment_id_fkey;

-- loyalty_config FKs
ALTER TABLE loyalty_config DROP CONSTRAINT IF EXISTS loyalty_config_store_id_fkey;

-- admin_audit_log_request_body / response_body FKs
ALTER TABLE admin_audit_log_request_body DROP CONSTRAINT IF EXISTS admin_audit_log_request_body_audit_log_id_fkey;
ALTER TABLE admin_audit_log_response_body DROP CONSTRAINT IF EXISTS admin_audit_log_response_body_audit_log_id_fkey;

-- admin_audit_log FKs
ALTER TABLE admin_audit_log DROP CONSTRAINT IF EXISTS admin_audit_log_user_id_fkey;
ALTER TABLE admin_audit_log DROP CONSTRAINT IF EXISTS admin_audit_log_store_id_fkey;

-- notification_preferences FKs
ALTER TABLE notification_preferences DROP CONSTRAINT IF EXISTS notification_preferences_user_id_fkey;

-- ingredient_groups FKs
ALTER TABLE ingredient_groups DROP CONSTRAINT IF EXISTS ingredient_groups_ingredient_id_fkey;
ALTER TABLE ingredient_groups DROP CONSTRAINT IF EXISTS ingredient_groups_group_id_fkey;

-- payments FKs
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_order_id_fkey;

-- orders FKs
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_customer_id_fkey;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_store_id_fkey;

-- inventory_log FKs
ALTER TABLE inventory_log DROP CONSTRAINT IF EXISTS inventory_log_ingredient_id_fkey;

-- store_invitations FKs
ALTER TABLE store_invitations DROP CONSTRAINT IF EXISTS store_invitations_store_id_fkey;

-- users_stores FKs
ALTER TABLE users_stores DROP CONSTRAINT IF EXISTS users_stores_user_id_fkey;
ALTER TABLE users_stores DROP CONSTRAINT IF EXISTS users_stores_store_id_fkey;

-- units FKs
ALTER TABLE units DROP CONSTRAINT IF EXISTS units_category_id_fkey;
ALTER TABLE units DROP CONSTRAINT IF EXISTS units_store_id_fkey;

-- groups FKs
ALTER TABLE groups DROP CONSTRAINT IF EXISTS groups_store_id_fkey;

-- ingredients FKs
ALTER TABLE ingredients DROP CONSTRAINT IF EXISTS ingredients_store_id_fkey;

-- customers FKs
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_store_id_fkey;

-- production_batches FKs
ALTER TABLE production_batches DROP CONSTRAINT IF EXISTS production_batches_store_id_fkey;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 3: Drop ALL primary key constraints
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE batch_prep_items DROP CONSTRAINT IF EXISTS batch_prep_items_pkey;
ALTER TABLE batch_orders DROP CONSTRAINT IF EXISTS batch_orders_pkey;
ALTER TABLE production_batches DROP CONSTRAINT IF EXISTS production_batches_pkey;
ALTER TABLE loyalty_transactions DROP CONSTRAINT IF EXISTS loyalty_transactions_pkey;
ALTER TABLE loyalty_config DROP CONSTRAINT IF EXISTS loyalty_config_pkey;
ALTER TABLE admin_audit_log_request_body DROP CONSTRAINT IF EXISTS admin_audit_log_request_body_pkey;
ALTER TABLE admin_audit_log_response_body DROP CONSTRAINT IF EXISTS admin_audit_log_response_body_pkey;
ALTER TABLE admin_audit_log DROP CONSTRAINT IF EXISTS admin_audit_log_pkey;
ALTER TABLE notification_preferences DROP CONSTRAINT IF EXISTS notification_preferences_pkey;
ALTER TABLE ingredient_groups DROP CONSTRAINT IF EXISTS ingredient_groups_pkey;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_pkey;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_pkey;
ALTER TABLE inventory_log DROP CONSTRAINT IF EXISTS inventory_log_pkey;
ALTER TABLE store_invitations DROP CONSTRAINT IF EXISTS store_invitations_pkey;
ALTER TABLE users_stores DROP CONSTRAINT IF EXISTS users_stores_pkey;
ALTER TABLE units DROP CONSTRAINT IF EXISTS units_pkey;
ALTER TABLE groups DROP CONSTRAINT IF EXISTS groups_pkey;
ALTER TABLE unit_categories DROP CONSTRAINT IF EXISTS unit_categories_pkey;
ALTER TABLE ingredients DROP CONSTRAINT IF EXISTS ingredients_pkey;
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_pkey;
ALTER TABLE stores DROP CONSTRAINT IF EXISTS stores_pkey;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey;

-- Drop unique constraints that reference UUID columns
ALTER TABLE loyalty_config DROP CONSTRAINT IF EXISTS loyalty_config_store_id_key;
ALTER TABLE units DROP CONSTRAINT IF EXISTS uq_units_user_abbrev;
ALTER TABLE groups DROP CONSTRAINT IF EXISTS uq_groups_user_name;
ALTER TABLE groups DROP CONSTRAINT IF EXISTS uq_groups_store_name;
ALTER TABLE notification_preferences DROP CONSTRAINT IF EXISTS uq_notif_pref_user_event;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 4: Convert PK columns (add new_id, populate, drop old, rename)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Helper: for each table with a UUID PK, add INTEGER new_id, populate from map, drop old, rename

-- users
ALTER TABLE users ADD COLUMN new_id INTEGER;
UPDATE users SET new_id = m.new_id FROM _map_users m WHERE users.id = m.old_id;
ALTER TABLE users DROP COLUMN id;
ALTER TABLE users RENAME COLUMN new_id TO id;
ALTER TABLE users ALTER COLUMN id SET NOT NULL;
ALTER TABLE users ADD PRIMARY KEY (id);
CREATE SEQUENCE users_id_seq OWNED BY users.id;
SELECT setval('users_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM users), 0), 1), COALESCE((SELECT MAX(id) FROM users), 0) > 0);
ALTER TABLE users ALTER COLUMN id SET DEFAULT nextval('users_id_seq');

-- stores
ALTER TABLE stores ADD COLUMN new_id INTEGER;
UPDATE stores SET new_id = m.new_id FROM _map_stores m WHERE stores.id = m.old_id;
ALTER TABLE stores DROP COLUMN id;
ALTER TABLE stores RENAME COLUMN new_id TO id;
ALTER TABLE stores ALTER COLUMN id SET NOT NULL;
ALTER TABLE stores ADD PRIMARY KEY (id);
CREATE SEQUENCE stores_id_seq OWNED BY stores.id;
SELECT setval('stores_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM stores), 0), 1), COALESCE((SELECT MAX(id) FROM stores), 0) > 0);
ALTER TABLE stores ALTER COLUMN id SET DEFAULT nextval('stores_id_seq');

-- customers
ALTER TABLE customers ADD COLUMN new_id INTEGER;
UPDATE customers SET new_id = m.new_id FROM _map_customers m WHERE customers.id = m.old_id;
ALTER TABLE customers DROP COLUMN id;
ALTER TABLE customers RENAME COLUMN new_id TO id;
ALTER TABLE customers ALTER COLUMN id SET NOT NULL;
ALTER TABLE customers ADD PRIMARY KEY (id);
CREATE SEQUENCE customers_id_seq OWNED BY customers.id;
SELECT setval('customers_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM customers), 0), 1), COALESCE((SELECT MAX(id) FROM customers), 0) > 0);
ALTER TABLE customers ALTER COLUMN id SET DEFAULT nextval('customers_id_seq');

-- ingredients
ALTER TABLE ingredients ADD COLUMN new_id INTEGER;
UPDATE ingredients SET new_id = m.new_id FROM _map_ingredients m WHERE ingredients.id = m.old_id;
ALTER TABLE ingredients DROP COLUMN id;
ALTER TABLE ingredients RENAME COLUMN new_id TO id;
ALTER TABLE ingredients ALTER COLUMN id SET NOT NULL;
ALTER TABLE ingredients ADD PRIMARY KEY (id);
CREATE SEQUENCE ingredients_id_seq OWNED BY ingredients.id;
SELECT setval('ingredients_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM ingredients), 0), 1), COALESCE((SELECT MAX(id) FROM ingredients), 0) > 0);
ALTER TABLE ingredients ALTER COLUMN id SET DEFAULT nextval('ingredients_id_seq');

-- inventory_log
ALTER TABLE inventory_log ADD COLUMN new_id INTEGER;
UPDATE inventory_log SET new_id = m.new_id FROM _map_inventory_log m WHERE inventory_log.id = m.old_id;
ALTER TABLE inventory_log DROP COLUMN id;
ALTER TABLE inventory_log RENAME COLUMN new_id TO id;
ALTER TABLE inventory_log ALTER COLUMN id SET NOT NULL;
ALTER TABLE inventory_log ADD PRIMARY KEY (id);
CREATE SEQUENCE inventory_log_id_seq OWNED BY inventory_log.id;
SELECT setval('inventory_log_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM inventory_log), 0), 1), COALESCE((SELECT MAX(id) FROM inventory_log), 0) > 0);
ALTER TABLE inventory_log ALTER COLUMN id SET DEFAULT nextval('inventory_log_id_seq');

-- orders
ALTER TABLE orders ADD COLUMN new_id INTEGER;
UPDATE orders SET new_id = m.new_id FROM _map_orders m WHERE orders.id = m.old_id;
ALTER TABLE orders DROP COLUMN id;
ALTER TABLE orders RENAME COLUMN new_id TO id;
ALTER TABLE orders ALTER COLUMN id SET NOT NULL;
ALTER TABLE orders ADD PRIMARY KEY (id);
CREATE SEQUENCE orders_id_seq OWNED BY orders.id;
SELECT setval('orders_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM orders), 0), 1), COALESCE((SELECT MAX(id) FROM orders), 0) > 0);
ALTER TABLE orders ALTER COLUMN id SET DEFAULT nextval('orders_id_seq');

-- payments
ALTER TABLE payments ADD COLUMN new_id INTEGER;
UPDATE payments SET new_id = m.new_id FROM _map_payments m WHERE payments.id = m.old_id;
ALTER TABLE payments DROP COLUMN id;
ALTER TABLE payments RENAME COLUMN new_id TO id;
ALTER TABLE payments ALTER COLUMN id SET NOT NULL;
ALTER TABLE payments ADD PRIMARY KEY (id);
CREATE SEQUENCE payments_id_seq OWNED BY payments.id;
SELECT setval('payments_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM payments), 0), 1), COALESCE((SELECT MAX(id) FROM payments), 0) > 0);
ALTER TABLE payments ALTER COLUMN id SET DEFAULT nextval('payments_id_seq');

-- unit_categories
ALTER TABLE unit_categories ADD COLUMN new_id INTEGER;
UPDATE unit_categories SET new_id = m.new_id FROM _map_unit_categories m WHERE unit_categories.id = m.old_id;
ALTER TABLE unit_categories DROP COLUMN id;
ALTER TABLE unit_categories RENAME COLUMN new_id TO id;
ALTER TABLE unit_categories ALTER COLUMN id SET NOT NULL;
ALTER TABLE unit_categories ADD PRIMARY KEY (id);
CREATE SEQUENCE unit_categories_id_seq OWNED BY unit_categories.id;
SELECT setval('unit_categories_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM unit_categories), 0), 1), COALESCE((SELECT MAX(id) FROM unit_categories), 0) > 0);
ALTER TABLE unit_categories ALTER COLUMN id SET DEFAULT nextval('unit_categories_id_seq');

-- units
ALTER TABLE units ADD COLUMN new_id INTEGER;
UPDATE units SET new_id = m.new_id FROM _map_units m WHERE units.id = m.old_id;
ALTER TABLE units DROP COLUMN id;
ALTER TABLE units RENAME COLUMN new_id TO id;
ALTER TABLE units ALTER COLUMN id SET NOT NULL;
ALTER TABLE units ADD PRIMARY KEY (id);
CREATE SEQUENCE units_id_seq OWNED BY units.id;
SELECT setval('units_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM units), 0), 1), COALESCE((SELECT MAX(id) FROM units), 0) > 0);
ALTER TABLE units ALTER COLUMN id SET DEFAULT nextval('units_id_seq');

-- groups
ALTER TABLE groups ADD COLUMN new_id INTEGER;
UPDATE groups SET new_id = m.new_id FROM _map_groups m WHERE groups.id = m.old_id;
ALTER TABLE groups DROP COLUMN id;
ALTER TABLE groups RENAME COLUMN new_id TO id;
ALTER TABLE groups ALTER COLUMN id SET NOT NULL;
ALTER TABLE groups ADD PRIMARY KEY (id);
CREATE SEQUENCE groups_id_seq OWNED BY groups.id;
SELECT setval('groups_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM groups), 0), 1), COALESCE((SELECT MAX(id) FROM groups), 0) > 0);
ALTER TABLE groups ALTER COLUMN id SET DEFAULT nextval('groups_id_seq');

-- notification_preferences
ALTER TABLE notification_preferences ADD COLUMN new_id INTEGER;
UPDATE notification_preferences SET new_id = m.new_id FROM _map_notification_preferences m WHERE notification_preferences.id = m.old_id;
ALTER TABLE notification_preferences DROP COLUMN id;
ALTER TABLE notification_preferences RENAME COLUMN new_id TO id;
ALTER TABLE notification_preferences ALTER COLUMN id SET NOT NULL;
ALTER TABLE notification_preferences ADD PRIMARY KEY (id);
CREATE SEQUENCE notification_preferences_id_seq OWNED BY notification_preferences.id;
SELECT setval('notification_preferences_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM notification_preferences), 0), 1), COALESCE((SELECT MAX(id) FROM notification_preferences), 0) > 0);
ALTER TABLE notification_preferences ALTER COLUMN id SET DEFAULT nextval('notification_preferences_id_seq');

-- store_invitations
ALTER TABLE store_invitations ADD COLUMN new_id INTEGER;
UPDATE store_invitations SET new_id = m.new_id FROM _map_store_invitations m WHERE store_invitations.id = m.old_id;
ALTER TABLE store_invitations DROP COLUMN id;
ALTER TABLE store_invitations RENAME COLUMN new_id TO id;
ALTER TABLE store_invitations ALTER COLUMN id SET NOT NULL;
ALTER TABLE store_invitations ADD PRIMARY KEY (id);
CREATE SEQUENCE store_invitations_id_seq OWNED BY store_invitations.id;
SELECT setval('store_invitations_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM store_invitations), 0), 1), COALESCE((SELECT MAX(id) FROM store_invitations), 0) > 0);
ALTER TABLE store_invitations ALTER COLUMN id SET DEFAULT nextval('store_invitations_id_seq');

-- admin_audit_log
ALTER TABLE admin_audit_log ADD COLUMN new_id INTEGER;
UPDATE admin_audit_log SET new_id = m.new_id FROM _map_admin_audit_log m WHERE admin_audit_log.id = m.old_id;
ALTER TABLE admin_audit_log DROP COLUMN id;
ALTER TABLE admin_audit_log RENAME COLUMN new_id TO id;
ALTER TABLE admin_audit_log ALTER COLUMN id SET NOT NULL;
ALTER TABLE admin_audit_log ADD PRIMARY KEY (id);
CREATE SEQUENCE admin_audit_log_id_seq OWNED BY admin_audit_log.id;
SELECT setval('admin_audit_log_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM admin_audit_log), 0), 1), COALESCE((SELECT MAX(id) FROM admin_audit_log), 0) > 0);
ALTER TABLE admin_audit_log ALTER COLUMN id SET DEFAULT nextval('admin_audit_log_id_seq');

-- loyalty_config
ALTER TABLE loyalty_config ADD COLUMN new_id INTEGER;
UPDATE loyalty_config SET new_id = m.new_id FROM _map_loyalty_config m WHERE loyalty_config.id = m.old_id;
ALTER TABLE loyalty_config DROP COLUMN id;
ALTER TABLE loyalty_config RENAME COLUMN new_id TO id;
ALTER TABLE loyalty_config ALTER COLUMN id SET NOT NULL;
ALTER TABLE loyalty_config ADD PRIMARY KEY (id);
CREATE SEQUENCE loyalty_config_id_seq OWNED BY loyalty_config.id;
SELECT setval('loyalty_config_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM loyalty_config), 0), 1), COALESCE((SELECT MAX(id) FROM loyalty_config), 0) > 0);
ALTER TABLE loyalty_config ALTER COLUMN id SET DEFAULT nextval('loyalty_config_id_seq');

-- loyalty_transactions
ALTER TABLE loyalty_transactions ADD COLUMN new_id INTEGER;
UPDATE loyalty_transactions SET new_id = m.new_id FROM _map_loyalty_transactions m WHERE loyalty_transactions.id = m.old_id;
ALTER TABLE loyalty_transactions DROP COLUMN id;
ALTER TABLE loyalty_transactions RENAME COLUMN new_id TO id;
ALTER TABLE loyalty_transactions ALTER COLUMN id SET NOT NULL;
ALTER TABLE loyalty_transactions ADD PRIMARY KEY (id);
CREATE SEQUENCE loyalty_transactions_id_seq OWNED BY loyalty_transactions.id;
SELECT setval('loyalty_transactions_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM loyalty_transactions), 0), 1), COALESCE((SELECT MAX(id) FROM loyalty_transactions), 0) > 0);
ALTER TABLE loyalty_transactions ALTER COLUMN id SET DEFAULT nextval('loyalty_transactions_id_seq');

-- production_batches
ALTER TABLE production_batches ADD COLUMN new_id INTEGER;
UPDATE production_batches SET new_id = m.new_id FROM _map_production_batches m WHERE production_batches.id = m.old_id;
ALTER TABLE production_batches DROP COLUMN id;
ALTER TABLE production_batches RENAME COLUMN new_id TO id;
ALTER TABLE production_batches ALTER COLUMN id SET NOT NULL;
ALTER TABLE production_batches ADD PRIMARY KEY (id);
CREATE SEQUENCE production_batches_id_seq OWNED BY production_batches.id;
SELECT setval('production_batches_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM production_batches), 0), 1), COALESCE((SELECT MAX(id) FROM production_batches), 0) > 0);
ALTER TABLE production_batches ALTER COLUMN id SET DEFAULT nextval('production_batches_id_seq');

-- batch_orders
ALTER TABLE batch_orders ADD COLUMN new_id INTEGER;
UPDATE batch_orders SET new_id = m.new_id FROM _map_batch_orders m WHERE batch_orders.id = m.old_id;
ALTER TABLE batch_orders DROP COLUMN id;
ALTER TABLE batch_orders RENAME COLUMN new_id TO id;
ALTER TABLE batch_orders ALTER COLUMN id SET NOT NULL;
ALTER TABLE batch_orders ADD PRIMARY KEY (id);
CREATE SEQUENCE batch_orders_id_seq OWNED BY batch_orders.id;
SELECT setval('batch_orders_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM batch_orders), 0), 1), COALESCE((SELECT MAX(id) FROM batch_orders), 0) > 0);
ALTER TABLE batch_orders ALTER COLUMN id SET DEFAULT nextval('batch_orders_id_seq');

-- batch_prep_items
ALTER TABLE batch_prep_items ADD COLUMN new_id INTEGER;
UPDATE batch_prep_items SET new_id = m.new_id FROM _map_batch_prep_items m WHERE batch_prep_items.id = m.old_id;
ALTER TABLE batch_prep_items DROP COLUMN id;
ALTER TABLE batch_prep_items RENAME COLUMN new_id TO id;
ALTER TABLE batch_prep_items ALTER COLUMN id SET NOT NULL;
ALTER TABLE batch_prep_items ADD PRIMARY KEY (id);
CREATE SEQUENCE batch_prep_items_id_seq OWNED BY batch_prep_items.id;
SELECT setval('batch_prep_items_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM batch_prep_items), 0), 1), COALESCE((SELECT MAX(id) FROM batch_prep_items), 0) > 0);
ALTER TABLE batch_prep_items ALTER COLUMN id SET DEFAULT nextval('batch_prep_items_id_seq');

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 5: Convert FK columns (add new col, populate from parent map, drop old, rename)
-- ═══════════════════════════════════════════════════════════════════════════════

-- customers.store_id
ALTER TABLE customers ADD COLUMN new_store_id INTEGER;
UPDATE customers SET new_store_id = m.new_id FROM _map_stores m WHERE customers.store_id = m.old_id;
ALTER TABLE customers DROP COLUMN store_id;
ALTER TABLE customers RENAME COLUMN new_store_id TO store_id;

-- ingredients.store_id
ALTER TABLE ingredients ADD COLUMN new_store_id INTEGER;
UPDATE ingredients SET new_store_id = m.new_id FROM _map_stores m WHERE ingredients.store_id = m.old_id;
ALTER TABLE ingredients DROP COLUMN store_id;
ALTER TABLE ingredients RENAME COLUMN new_store_id TO store_id;

-- orders.store_id
ALTER TABLE orders ADD COLUMN new_store_id INTEGER;
UPDATE orders SET new_store_id = m.new_id FROM _map_stores m WHERE orders.store_id = m.old_id;
ALTER TABLE orders DROP COLUMN store_id;
ALTER TABLE orders RENAME COLUMN new_store_id TO store_id;

-- orders.customer_id
ALTER TABLE orders ADD COLUMN new_customer_id INTEGER;
UPDATE orders SET new_customer_id = m.new_id FROM _map_customers m WHERE orders.customer_id = m.old_id;
ALTER TABLE orders DROP COLUMN customer_id;
ALTER TABLE orders RENAME COLUMN new_customer_id TO customer_id;

-- orders.recurring_group_id (UUID → INTEGER via sequence)
ALTER TABLE orders ADD COLUMN new_recurring_group_id INTEGER;
UPDATE orders SET new_recurring_group_id = m.new_id FROM _map_recurring_group m WHERE orders.recurring_group_id = m.old_id;
ALTER TABLE orders DROP COLUMN recurring_group_id;
ALTER TABLE orders RENAME COLUMN new_recurring_group_id TO recurring_group_id;
CREATE SEQUENCE recurring_group_id_seq;
SELECT setval('recurring_group_id_seq', GREATEST(COALESCE((SELECT MAX(new_id) FROM _map_recurring_group), 0), 1), COALESCE((SELECT MAX(new_id) FROM _map_recurring_group), 0) > 0);

-- payments.order_id
ALTER TABLE payments ADD COLUMN new_order_id INTEGER;
UPDATE payments SET new_order_id = m.new_id FROM _map_orders m WHERE payments.order_id = m.old_id;
ALTER TABLE payments DROP COLUMN order_id;
ALTER TABLE payments RENAME COLUMN new_order_id TO order_id;
ALTER TABLE payments ALTER COLUMN order_id SET NOT NULL;

-- inventory_log.ingredient_id
ALTER TABLE inventory_log ADD COLUMN new_ingredient_id INTEGER;
UPDATE inventory_log SET new_ingredient_id = m.new_id FROM _map_ingredients m WHERE inventory_log.ingredient_id = m.old_id;
ALTER TABLE inventory_log DROP COLUMN ingredient_id;
ALTER TABLE inventory_log RENAME COLUMN new_ingredient_id TO ingredient_id;
ALTER TABLE inventory_log ALTER COLUMN ingredient_id SET NOT NULL;

-- units.category_id
ALTER TABLE units ADD COLUMN new_category_id INTEGER;
UPDATE units SET new_category_id = m.new_id FROM _map_unit_categories m WHERE units.category_id = m.old_id;
ALTER TABLE units DROP COLUMN category_id;
ALTER TABLE units RENAME COLUMN new_category_id TO category_id;
ALTER TABLE units ALTER COLUMN category_id SET NOT NULL;

-- units.store_id
ALTER TABLE units ADD COLUMN new_store_id INTEGER;
UPDATE units SET new_store_id = m.new_id FROM _map_stores m WHERE units.store_id = m.old_id;
ALTER TABLE units DROP COLUMN store_id;
ALTER TABLE units RENAME COLUMN new_store_id TO store_id;

-- groups.store_id
ALTER TABLE groups ADD COLUMN new_store_id INTEGER;
UPDATE groups SET new_store_id = m.new_id FROM _map_stores m WHERE groups.store_id = m.old_id;
ALTER TABLE groups DROP COLUMN store_id;
ALTER TABLE groups RENAME COLUMN new_store_id TO store_id;

-- notification_preferences.user_id
ALTER TABLE notification_preferences ADD COLUMN new_user_id INTEGER;
UPDATE notification_preferences SET new_user_id = m.new_id FROM _map_users m WHERE notification_preferences.user_id = m.old_id;
ALTER TABLE notification_preferences DROP COLUMN user_id;
ALTER TABLE notification_preferences RENAME COLUMN new_user_id TO user_id;
ALTER TABLE notification_preferences ALTER COLUMN user_id SET NOT NULL;

-- store_invitations.store_id (nullable)
ALTER TABLE store_invitations ADD COLUMN new_store_id INTEGER;
UPDATE store_invitations SET new_store_id = m.new_id FROM _map_stores m WHERE store_invitations.store_id = m.old_id;
ALTER TABLE store_invitations DROP COLUMN store_id;
ALTER TABLE store_invitations RENAME COLUMN new_store_id TO store_id;

-- users_stores: composite PK junction table
ALTER TABLE users_stores ADD COLUMN new_user_id INTEGER;
ALTER TABLE users_stores ADD COLUMN new_store_id INTEGER;
UPDATE users_stores SET new_user_id = m.new_id FROM _map_users m WHERE users_stores.user_id = m.old_id;
UPDATE users_stores SET new_store_id = m.new_id FROM _map_stores m WHERE users_stores.store_id = m.old_id;
ALTER TABLE users_stores DROP COLUMN user_id;
ALTER TABLE users_stores DROP COLUMN store_id;
ALTER TABLE users_stores RENAME COLUMN new_user_id TO user_id;
ALTER TABLE users_stores RENAME COLUMN new_store_id TO store_id;
ALTER TABLE users_stores ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE users_stores ALTER COLUMN store_id SET NOT NULL;

-- ingredient_groups: composite PK junction table
ALTER TABLE ingredient_groups ADD COLUMN new_ingredient_id INTEGER;
ALTER TABLE ingredient_groups ADD COLUMN new_group_id INTEGER;
UPDATE ingredient_groups SET new_ingredient_id = m.new_id FROM _map_ingredients m WHERE ingredient_groups.ingredient_id = m.old_id;
UPDATE ingredient_groups SET new_group_id = m.new_id FROM _map_groups m WHERE ingredient_groups.group_id = m.old_id;
ALTER TABLE ingredient_groups DROP COLUMN ingredient_id;
ALTER TABLE ingredient_groups DROP COLUMN group_id;
ALTER TABLE ingredient_groups RENAME COLUMN new_ingredient_id TO ingredient_id;
ALTER TABLE ingredient_groups RENAME COLUMN new_group_id TO group_id;
ALTER TABLE ingredient_groups ALTER COLUMN ingredient_id SET NOT NULL;
ALTER TABLE ingredient_groups ALTER COLUMN group_id SET NOT NULL;

-- admin_audit_log.user_id
ALTER TABLE admin_audit_log ADD COLUMN new_user_id INTEGER;
UPDATE admin_audit_log SET new_user_id = m.new_id FROM _map_users m WHERE admin_audit_log.user_id = m.old_id;
ALTER TABLE admin_audit_log DROP COLUMN user_id;
ALTER TABLE admin_audit_log RENAME COLUMN new_user_id TO user_id;
ALTER TABLE admin_audit_log ALTER COLUMN user_id SET NOT NULL;

-- admin_audit_log.store_id (nullable)
ALTER TABLE admin_audit_log ADD COLUMN new_store_id INTEGER;
UPDATE admin_audit_log SET new_store_id = m.new_id FROM _map_stores m WHERE admin_audit_log.store_id = m.old_id;
ALTER TABLE admin_audit_log DROP COLUMN store_id;
ALTER TABLE admin_audit_log RENAME COLUMN new_store_id TO store_id;

-- admin_audit_log_request_body.audit_log_id (PK = FK)
ALTER TABLE admin_audit_log_request_body ADD COLUMN new_audit_log_id INTEGER;
UPDATE admin_audit_log_request_body SET new_audit_log_id = m.new_id FROM _map_admin_audit_log m WHERE admin_audit_log_request_body.audit_log_id = m.old_id;
ALTER TABLE admin_audit_log_request_body DROP COLUMN audit_log_id;
ALTER TABLE admin_audit_log_request_body RENAME COLUMN new_audit_log_id TO audit_log_id;
ALTER TABLE admin_audit_log_request_body ALTER COLUMN audit_log_id SET NOT NULL;
ALTER TABLE admin_audit_log_request_body ADD PRIMARY KEY (audit_log_id);

-- admin_audit_log_response_body.audit_log_id (PK = FK)
ALTER TABLE admin_audit_log_response_body ADD COLUMN new_audit_log_id INTEGER;
UPDATE admin_audit_log_response_body SET new_audit_log_id = m.new_id FROM _map_admin_audit_log m WHERE admin_audit_log_response_body.audit_log_id = m.old_id;
ALTER TABLE admin_audit_log_response_body DROP COLUMN audit_log_id;
ALTER TABLE admin_audit_log_response_body RENAME COLUMN new_audit_log_id TO audit_log_id;
ALTER TABLE admin_audit_log_response_body ALTER COLUMN audit_log_id SET NOT NULL;
ALTER TABLE admin_audit_log_response_body ADD PRIMARY KEY (audit_log_id);

-- loyalty_config.store_id
ALTER TABLE loyalty_config ADD COLUMN new_store_id INTEGER;
UPDATE loyalty_config SET new_store_id = m.new_id FROM _map_stores m WHERE loyalty_config.store_id = m.old_id;
ALTER TABLE loyalty_config DROP COLUMN store_id;
ALTER TABLE loyalty_config RENAME COLUMN new_store_id TO store_id;
ALTER TABLE loyalty_config ALTER COLUMN store_id SET NOT NULL;

-- loyalty_transactions.store_id
ALTER TABLE loyalty_transactions ADD COLUMN new_store_id INTEGER;
UPDATE loyalty_transactions SET new_store_id = m.new_id FROM _map_stores m WHERE loyalty_transactions.store_id = m.old_id;
ALTER TABLE loyalty_transactions DROP COLUMN store_id;
ALTER TABLE loyalty_transactions RENAME COLUMN new_store_id TO store_id;
ALTER TABLE loyalty_transactions ALTER COLUMN store_id SET NOT NULL;

-- loyalty_transactions.customer_id
ALTER TABLE loyalty_transactions ADD COLUMN new_customer_id INTEGER;
UPDATE loyalty_transactions SET new_customer_id = m.new_id FROM _map_customers m WHERE loyalty_transactions.customer_id = m.old_id;
ALTER TABLE loyalty_transactions DROP COLUMN customer_id;
ALTER TABLE loyalty_transactions RENAME COLUMN new_customer_id TO customer_id;
ALTER TABLE loyalty_transactions ALTER COLUMN customer_id SET NOT NULL;

-- loyalty_transactions.payment_id (nullable)
ALTER TABLE loyalty_transactions ADD COLUMN new_payment_id INTEGER;
UPDATE loyalty_transactions SET new_payment_id = m.new_id FROM _map_payments m WHERE loyalty_transactions.payment_id = m.old_id;
ALTER TABLE loyalty_transactions DROP COLUMN payment_id;
ALTER TABLE loyalty_transactions RENAME COLUMN new_payment_id TO payment_id;

-- production_batches.store_id
ALTER TABLE production_batches ADD COLUMN new_store_id INTEGER;
UPDATE production_batches SET new_store_id = m.new_id FROM _map_stores m WHERE production_batches.store_id = m.old_id;
ALTER TABLE production_batches DROP COLUMN store_id;
ALTER TABLE production_batches RENAME COLUMN new_store_id TO store_id;
ALTER TABLE production_batches ALTER COLUMN store_id SET NOT NULL;

-- batch_orders.batch_id
ALTER TABLE batch_orders ADD COLUMN new_batch_id INTEGER;
UPDATE batch_orders SET new_batch_id = m.new_id FROM _map_production_batches m WHERE batch_orders.batch_id = m.old_id;
ALTER TABLE batch_orders DROP COLUMN batch_id;
ALTER TABLE batch_orders RENAME COLUMN new_batch_id TO batch_id;
ALTER TABLE batch_orders ALTER COLUMN batch_id SET NOT NULL;

-- batch_orders.order_id
ALTER TABLE batch_orders ADD COLUMN new_order_id INTEGER;
UPDATE batch_orders SET new_order_id = m.new_id FROM _map_orders m WHERE batch_orders.order_id = m.old_id;
ALTER TABLE batch_orders DROP COLUMN order_id;
ALTER TABLE batch_orders RENAME COLUMN new_order_id TO order_id;
ALTER TABLE batch_orders ALTER COLUMN order_id SET NOT NULL;

-- batch_orders.store_id
ALTER TABLE batch_orders ADD COLUMN new_store_id INTEGER;
UPDATE batch_orders SET new_store_id = m.new_id FROM _map_stores m WHERE batch_orders.store_id = m.old_id;
ALTER TABLE batch_orders DROP COLUMN store_id;
ALTER TABLE batch_orders RENAME COLUMN new_store_id TO store_id;
ALTER TABLE batch_orders ALTER COLUMN store_id SET NOT NULL;

-- batch_prep_items.batch_id
ALTER TABLE batch_prep_items ADD COLUMN new_batch_id INTEGER;
UPDATE batch_prep_items SET new_batch_id = m.new_id FROM _map_production_batches m WHERE batch_prep_items.batch_id = m.old_id;
ALTER TABLE batch_prep_items DROP COLUMN batch_id;
ALTER TABLE batch_prep_items RENAME COLUMN new_batch_id TO batch_id;
ALTER TABLE batch_prep_items ALTER COLUMN batch_id SET NOT NULL;

-- batch_prep_items.ingredient_id
ALTER TABLE batch_prep_items ADD COLUMN new_ingredient_id INTEGER;
UPDATE batch_prep_items SET new_ingredient_id = m.new_id FROM _map_ingredients m WHERE batch_prep_items.ingredient_id = m.old_id;
ALTER TABLE batch_prep_items DROP COLUMN ingredient_id;
ALTER TABLE batch_prep_items RENAME COLUMN new_ingredient_id TO ingredient_id;
ALTER TABLE batch_prep_items ALTER COLUMN ingredient_id SET NOT NULL;

-- batch_prep_items.store_id
ALTER TABLE batch_prep_items ADD COLUMN new_store_id INTEGER;
UPDATE batch_prep_items SET new_store_id = m.new_id FROM _map_stores m WHERE batch_prep_items.store_id = m.old_id;
ALTER TABLE batch_prep_items DROP COLUMN store_id;
ALTER TABLE batch_prep_items RENAME COLUMN new_store_id TO store_id;
ALTER TABLE batch_prep_items ALTER COLUMN store_id SET NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 6: Re-add primary keys for junction tables, foreign keys, unique constraints, indexes
-- ═══════════════════════════════════════════════════════════════════════════════

-- Junction table PKs
ALTER TABLE users_stores ADD PRIMARY KEY (user_id, store_id);
ALTER TABLE ingredient_groups ADD PRIMARY KEY (ingredient_id, group_id);

-- Foreign keys
ALTER TABLE customers ADD CONSTRAINT customers_store_id_fkey FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE ingredients ADD CONSTRAINT ingredients_store_id_fkey FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE orders ADD CONSTRAINT orders_store_id_fkey FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE orders ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id);
ALTER TABLE payments ADD CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
ALTER TABLE inventory_log ADD CONSTRAINT inventory_log_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE;
ALTER TABLE units ADD CONSTRAINT units_category_id_fkey FOREIGN KEY (category_id) REFERENCES unit_categories(id);
ALTER TABLE units ADD CONSTRAINT units_store_id_fkey FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE groups ADD CONSTRAINT groups_store_id_fkey FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE notification_preferences ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE store_invitations ADD CONSTRAINT store_invitations_store_id_fkey FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE users_stores ADD CONSTRAINT users_stores_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE users_stores ADD CONSTRAINT users_stores_store_id_fkey FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE ingredient_groups ADD CONSTRAINT ingredient_groups_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE;
ALTER TABLE ingredient_groups ADD CONSTRAINT ingredient_groups_group_id_fkey FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;
ALTER TABLE admin_audit_log ADD CONSTRAINT admin_audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE admin_audit_log ADD CONSTRAINT admin_audit_log_store_id_fkey FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE admin_audit_log_request_body ADD CONSTRAINT admin_audit_log_request_body_audit_log_id_fkey FOREIGN KEY (audit_log_id) REFERENCES admin_audit_log(id) ON DELETE CASCADE;
ALTER TABLE admin_audit_log_response_body ADD CONSTRAINT admin_audit_log_response_body_audit_log_id_fkey FOREIGN KEY (audit_log_id) REFERENCES admin_audit_log(id) ON DELETE CASCADE;
ALTER TABLE loyalty_config ADD CONSTRAINT loyalty_config_store_id_fkey FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE loyalty_transactions ADD CONSTRAINT loyalty_transactions_store_id_fkey FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE loyalty_transactions ADD CONSTRAINT loyalty_transactions_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
ALTER TABLE loyalty_transactions ADD CONSTRAINT loyalty_transactions_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL;
ALTER TABLE production_batches ADD CONSTRAINT production_batches_store_id_fkey FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE batch_orders ADD CONSTRAINT batch_orders_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES production_batches(id) ON DELETE CASCADE;
ALTER TABLE batch_orders ADD CONSTRAINT batch_orders_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
ALTER TABLE batch_orders ADD CONSTRAINT batch_orders_store_id_fkey FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE batch_prep_items ADD CONSTRAINT batch_prep_items_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES production_batches(id) ON DELETE CASCADE;
ALTER TABLE batch_prep_items ADD CONSTRAINT batch_prep_items_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE;
ALTER TABLE batch_prep_items ADD CONSTRAINT batch_prep_items_store_id_fkey FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;

-- Unique constraints
ALTER TABLE loyalty_config ADD CONSTRAINT loyalty_config_store_id_key UNIQUE (store_id);
ALTER TABLE units ADD CONSTRAINT uq_units_store_abbrev UNIQUE (store_id, abbreviation);
ALTER TABLE notification_preferences ADD CONSTRAINT uq_notif_pref_user_event UNIQUE (user_id, event_type);

-- Recreate indexes on FK columns (drop old UUID-based ones first, they were dropped with the column)
CREATE INDEX IF NOT EXISTS idx_customers_store ON customers(store_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_store ON ingredients(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_store ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_recurring_group ON orders(recurring_group_id) WHERE recurring_group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_log_ingredient ON inventory_log(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_units_store ON units(store_id);
CREATE INDEX IF NOT EXISTS idx_units_category ON units(category_id);
CREATE INDEX IF NOT EXISTS idx_groups_store ON groups(store_id);
CREATE INDEX IF NOT EXISTS idx_notif_pref_user ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_users_stores_store ON users_stores(store_id);
CREATE INDEX IF NOT EXISTS idx_ingredient_groups_group ON ingredient_groups(group_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_user_id ON admin_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_store_invitations_token ON store_invitations(token);
CREATE INDEX IF NOT EXISTS idx_store_invitations_email ON store_invitations(email);
CREATE INDEX IF NOT EXISTS idx_loyalty_tx_customer ON loyalty_transactions(customer_id, store_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_tx_payment ON loyalty_transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_tx_created_at ON loyalty_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_production_batches_store_date ON production_batches(store_id, production_date);
CREATE INDEX IF NOT EXISTS idx_production_batches_store_stage ON production_batches(store_id, stage);
CREATE INDEX IF NOT EXISTS idx_batch_orders_batch ON batch_orders(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_orders_order ON batch_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_batch_prep_items_batch ON batch_prep_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_prep_items_store_date ON batch_prep_items(store_id);

COMMIT;
