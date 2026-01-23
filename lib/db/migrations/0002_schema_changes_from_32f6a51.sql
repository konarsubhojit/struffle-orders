-- Migration: Schema changes from commit 32f6a51e0b996b8a59f35cb29973b882b64127ff
-- Description: Migrates from initial schema to current optimized schema with new features
-- Date: 2026-01-23
-- 
-- This migration includes:
-- - New enums for type-safe status fields
-- - New tables: customers, categories, tags, audit_logs, etc.
-- - Column additions for stock management, cost tracking, CRM
-- - Type changes (integer->boolean, text->enum, timestamps with timezone)
-- - Improved indexes and check constraints
--
-- IMPORTANT: Run in a transaction. Test on staging first.

BEGIN;

-- ============================================
-- 1. CREATE NEW ENUMS
-- ============================================

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('unpaid', 'partially_paid', 'paid', 'cash_on_delivery', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE confirmation_status AS ENUM ('unconfirmed', 'pending_confirmation', 'confirmed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE delivery_status AS ENUM ('not_shipped', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'returned');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete', 'restore', 'bulk_import', 'bulk_export', 'bulk_update', 'bulk_delete');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE audit_entity AS ENUM ('order', 'item', 'category', 'tag', 'user', 'feedback', 'customer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE customer_source AS ENUM ('walk-in', 'online', 'referral', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE order_note_type AS ENUM ('internal', 'customer', 'system');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE stock_transaction_type AS ENUM ('order_placed', 'order_cancelled', 'adjustment', 'restock', 'return');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE digest_status AS ENUM ('pending', 'started', 'running', 'sent', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE job_type AS ENUM ('import', 'export');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE job_status AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE stock_reference_type AS ENUM ('order', 'manual', 'return', 'adjustment');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 2. CREATE NEW TABLES (before altering existing ones due to FK references)
-- ============================================

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    customer_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    source customer_source,
    total_orders INTEGER NOT NULL DEFAULT 0,
    total_spent NUMERIC(10, 2) NOT NULL DEFAULT 0,
    first_order_date TIMESTAMP WITH TIME ZONE,
    last_order_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS customers_name_idx ON customers(name);
CREATE INDEX IF NOT EXISTS customers_email_idx ON customers(email);
CREATE INDEX IF NOT EXISTS customers_phone_idx ON customers(phone);
CREATE INDEX IF NOT EXISTS customers_source_idx ON customers(source);
CREATE INDEX IF NOT EXISTS customers_last_order_date_idx ON customers(last_order_date);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT NOT NULL DEFAULT '#6B7280',
    parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS categories_parent_id_idx ON categories(parent_id);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#3B82F6',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Item Categories junction table
CREATE TABLE IF NOT EXISTS item_categories (
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (item_id, category_id)
);

CREATE INDEX IF NOT EXISTS item_categories_category_id_idx ON item_categories(category_id);

-- Item Tags junction table
CREATE TABLE IF NOT EXISTS item_tags (
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (item_id, tag_id)
);

CREATE INDEX IF NOT EXISTS item_tags_tag_id_idx ON item_tags(tag_id);

-- Audit Logs table (using BIGSERIAL for high volume)
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    entity_type audit_entity NOT NULL,
    entity_id INTEGER NOT NULL,
    action audit_action NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    user_email TEXT,
    user_name TEXT,
    previous_data JSONB,
    new_data JSONB,
    changed_fields JSONB,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS audit_logs_entity_lookup_idx ON audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs(action);

-- Order Audit Trail table (using BIGSERIAL)
CREATE TABLE IF NOT EXISTS order_audit_trail (
    id BIGSERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    action audit_action NOT NULL,
    field_name TEXT,
    old_value TEXT,
    new_value TEXT,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    user_email TEXT,
    user_name TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS order_audit_trail_history_idx ON order_audit_trail(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS order_audit_trail_action_idx ON order_audit_trail(action);

-- Import/Export Jobs table
CREATE TABLE IF NOT EXISTS import_export_jobs (
    id SERIAL PRIMARY KEY,
    job_type job_type NOT NULL,
    entity_type audit_entity NOT NULL,
    status job_status NOT NULL DEFAULT 'pending',
    file_name TEXT,
    file_url TEXT,
    total_records INTEGER,
    processed_records INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    errors JSONB,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    user_email TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS import_export_jobs_type_status_idx ON import_export_jobs(job_type, status);
CREATE INDEX IF NOT EXISTS import_export_jobs_user_id_idx ON import_export_jobs(user_id);
CREATE INDEX IF NOT EXISTS import_export_jobs_created_at_idx ON import_export_jobs(created_at DESC);

-- Order Notes table
CREATE TABLE IF NOT EXISTS order_notes (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    note_text TEXT NOT NULL,
    note_type order_note_type NOT NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    user_email TEXT,
    user_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS order_notes_order_pinned_idx ON order_notes(order_id, is_pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS order_notes_note_type_idx ON order_notes(note_type);

-- Stock Transactions table (using BIGSERIAL)
CREATE TABLE IF NOT EXISTS stock_transactions (
    id BIGSERIAL PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    transaction_type stock_transaction_type NOT NULL,
    quantity INTEGER NOT NULL,
    previous_stock INTEGER,
    new_stock INTEGER,
    reference_type stock_reference_type,
    reference_id INTEGER,
    notes TEXT,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    user_email TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS stock_transactions_item_history_idx ON stock_transactions(item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS stock_transactions_type_idx ON stock_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS stock_transactions_reference_idx ON stock_transactions(reference_type, reference_id);

-- ============================================
-- 3. ALTER ITEMS TABLE - Add new columns
-- ============================================

-- Stock management columns
ALTER TABLE items ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT 0;
ALTER TABLE items ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER NOT NULL DEFAULT 5;
ALTER TABLE items ADD COLUMN IF NOT EXISTS track_stock BOOLEAN NOT NULL DEFAULT FALSE;

-- Cost and supplier columns
ALTER TABLE items ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10, 2);
ALTER TABLE items ADD COLUMN IF NOT EXISTS supplier_name TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS supplier_sku TEXT;

-- Timestamps
ALTER TABLE items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Convert existing timestamps to WITH TIME ZONE (if not already)
ALTER TABLE items 
    ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN deleted_at TYPE TIMESTAMP WITH TIME ZONE USING deleted_at AT TIME ZONE 'UTC';

-- Add check constraint for stock
ALTER TABLE items DROP CONSTRAINT IF EXISTS stock_non_negative;
ALTER TABLE items ADD CONSTRAINT stock_non_negative CHECK (stock_quantity >= 0);

-- New indexes for items
DROP INDEX IF EXISTS items_name_idx;
DROP INDEX IF EXISTS items_deleted_at_idx;
CREATE INDEX IF NOT EXISTS items_active_idx ON items(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS items_name_active_idx ON items(name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS items_low_stock_alert_idx ON items(id) WHERE track_stock = TRUE AND stock_quantity <= low_stock_threshold;
CREATE INDEX IF NOT EXISTS items_stock_quantity_idx ON items(stock_quantity);

-- ============================================
-- 4. ALTER ITEM_DESIGNS TABLE
-- ============================================

ALTER TABLE item_designs 
    ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE USING created_at AT TIME ZONE 'UTC';

-- Update indexes
DROP INDEX IF EXISTS item_designs_is_primary_idx;
CREATE INDEX IF NOT EXISTS item_designs_primary_idx ON item_designs(item_id) WHERE is_primary = TRUE;

-- ============================================
-- 5. ALTER ORDERS TABLE
-- ============================================

-- Add customer_id_ref FK to customers
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id_ref INTEGER REFERENCES customers(id) ON DELETE SET NULL;

-- Add updated_at column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Convert timestamps to WITH TIME ZONE
ALTER TABLE orders 
    ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN order_date TYPE TIMESTAMP WITH TIME ZONE USING order_date AT TIME ZONE 'UTC',
    ALTER COLUMN expected_delivery_date TYPE TIMESTAMP WITH TIME ZONE USING expected_delivery_date AT TIME ZONE 'UTC',
    ALTER COLUMN actual_delivery_date TYPE TIMESTAMP WITH TIME ZONE USING actual_delivery_date AT TIME ZONE 'UTC';

-- Set default for order_date
ALTER TABLE orders ALTER COLUMN order_date SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE orders ALTER COLUMN order_date SET NOT NULL;

-- Convert text status columns to proper enums
-- First, add temporary columns with new types
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status_new order_status;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status_new payment_status;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmation_status_new confirmation_status;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_status_new delivery_status;

-- Migrate data (handle any unexpected values)
UPDATE orders SET status_new = COALESCE(status::order_status, 'pending') WHERE status_new IS NULL;
UPDATE orders SET payment_status_new = COALESCE(payment_status::payment_status, 'unpaid') WHERE payment_status_new IS NULL;
UPDATE orders SET confirmation_status_new = COALESCE(confirmation_status::confirmation_status, 'unconfirmed') WHERE confirmation_status_new IS NULL;
UPDATE orders SET delivery_status_new = COALESCE(delivery_status::delivery_status, 'not_shipped') WHERE delivery_status_new IS NULL;

-- Drop old columns and rename new ones
ALTER TABLE orders DROP COLUMN IF EXISTS status CASCADE;
ALTER TABLE orders RENAME COLUMN status_new TO status;
ALTER TABLE orders ALTER COLUMN status SET NOT NULL;
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'pending';

ALTER TABLE orders DROP COLUMN IF EXISTS payment_status CASCADE;
ALTER TABLE orders RENAME COLUMN payment_status_new TO payment_status;
ALTER TABLE orders ALTER COLUMN payment_status SET NOT NULL;
ALTER TABLE orders ALTER COLUMN payment_status SET DEFAULT 'unpaid';

ALTER TABLE orders DROP COLUMN IF EXISTS confirmation_status CASCADE;
ALTER TABLE orders RENAME COLUMN confirmation_status_new TO confirmation_status;
ALTER TABLE orders ALTER COLUMN confirmation_status SET NOT NULL;
ALTER TABLE orders ALTER COLUMN confirmation_status SET DEFAULT 'unconfirmed';

ALTER TABLE orders DROP COLUMN IF EXISTS delivery_status CASCADE;
ALTER TABLE orders RENAME COLUMN delivery_status_new TO delivery_status;
ALTER TABLE orders ALTER COLUMN delivery_status SET NOT NULL;
ALTER TABLE orders ALTER COLUMN delivery_status SET DEFAULT 'not_shipped';

-- Update priority to NOT NULL with default
ALTER TABLE orders ALTER COLUMN priority SET NOT NULL;
ALTER TABLE orders ALTER COLUMN priority SET DEFAULT 0;

-- Add paid_amount NOT NULL
ALTER TABLE orders ALTER COLUMN paid_amount SET NOT NULL;
ALTER TABLE orders ALTER COLUMN paid_amount SET DEFAULT 0;

-- Add check constraint for priority
ALTER TABLE orders DROP CONSTRAINT IF EXISTS priority_range;
ALTER TABLE orders ADD CONSTRAINT priority_range CHECK (priority >= 0 AND priority <= 10);

-- Update indexes
DROP INDEX IF EXISTS orders_order_id_idx;
DROP INDEX IF EXISTS orders_customer_id_idx;
DROP INDEX IF EXISTS orders_delivery_date_idx;
DROP INDEX IF EXISTS orders_priority_idx;
DROP INDEX IF EXISTS orders_status_idx;
DROP INDEX IF EXISTS orders_created_at_idx;
DROP INDEX IF EXISTS orders_created_at_id_idx;

CREATE INDEX IF NOT EXISTS orders_customer_id_idx ON orders(customer_id);
CREATE INDEX IF NOT EXISTS orders_customer_id_ref_idx ON orders(customer_id_ref);
CREATE INDEX IF NOT EXISTS orders_delivery_date_idx ON orders(expected_delivery_date);
CREATE INDEX IF NOT EXISTS orders_priority_idx ON orders(priority);
CREATE INDEX IF NOT EXISTS orders_status_created_idx ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_payment_status_created_idx ON orders(payment_status, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_created_at_id_idx ON orders(created_at DESC, id DESC);

-- ============================================
-- 6. ALTER ORDER_ITEMS TABLE
-- ============================================

-- Add new columns
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10, 2);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Change item_id FK to RESTRICT on delete
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_item_id_fkey;
ALTER TABLE order_items ADD CONSTRAINT order_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE RESTRICT;

-- Add check constraint for quantity
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS quantity_positive;
ALTER TABLE order_items ADD CONSTRAINT quantity_positive CHECK (quantity > 0);

-- Add item_id index
CREATE INDEX IF NOT EXISTS order_items_item_id_idx ON order_items(item_id);

-- ============================================
-- 7. ALTER FEEDBACKS TABLE
-- ============================================

-- Convert timestamps to WITH TIME ZONE
ALTER TABLE feedbacks 
    ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE USING updated_at AT TIME ZONE 'UTC',
    ALTER COLUMN responded_at TYPE TIMESTAMP WITH TIME ZONE USING responded_at AT TIME ZONE 'UTC';

-- Convert is_public from integer to boolean
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS is_public_new BOOLEAN NOT NULL DEFAULT TRUE;
UPDATE feedbacks SET is_public_new = (COALESCE(is_public, 1) = 1);
ALTER TABLE feedbacks DROP COLUMN IF EXISTS is_public;
ALTER TABLE feedbacks RENAME COLUMN is_public_new TO is_public;

-- Add unique constraint on order_id (one feedback per order)
ALTER TABLE feedbacks DROP CONSTRAINT IF EXISTS feedbacks_order_id_unique;
DO $$ BEGIN
    ALTER TABLE feedbacks ADD CONSTRAINT feedbacks_order_id_unique UNIQUE (order_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add check constraints for ratings
ALTER TABLE feedbacks DROP CONSTRAINT IF EXISTS rating_range;
ALTER TABLE feedbacks ADD CONSTRAINT rating_range CHECK (rating >= 1 AND rating <= 5);

ALTER TABLE feedbacks DROP CONSTRAINT IF EXISTS product_quality_range;
ALTER TABLE feedbacks ADD CONSTRAINT product_quality_range CHECK (product_quality IS NULL OR (product_quality >= 1 AND product_quality <= 5));

ALTER TABLE feedbacks DROP CONSTRAINT IF EXISTS delivery_experience_range;
ALTER TABLE feedbacks ADD CONSTRAINT delivery_experience_range CHECK (delivery_experience IS NULL OR (delivery_experience >= 1 AND delivery_experience <= 5));

-- Update indexes
DROP INDEX IF EXISTS idx_feedbacks_order_id;
DROP INDEX IF EXISTS idx_feedbacks_rating;
DROP INDEX IF EXISTS idx_feedbacks_created_at;
DROP INDEX IF EXISTS idx_feedbacks_is_public;

CREATE INDEX IF NOT EXISTS feedbacks_rating_idx ON feedbacks(rating);
CREATE INDEX IF NOT EXISTS feedbacks_created_at_idx ON feedbacks(created_at);
CREATE INDEX IF NOT EXISTS feedbacks_public_idx ON feedbacks(created_at DESC) WHERE is_public = TRUE;

-- ============================================
-- 8. ALTER FEEDBACK_TOKENS TABLE
-- ============================================

-- Convert timestamps to WITH TIME ZONE
ALTER TABLE feedback_tokens 
    ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN expires_at TYPE TIMESTAMP WITH TIME ZONE USING expires_at AT TIME ZONE 'UTC';

-- Convert used from integer to boolean
ALTER TABLE feedback_tokens ADD COLUMN IF NOT EXISTS used_new BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE feedback_tokens SET used_new = (COALESCE(used, 0) = 1);
ALTER TABLE feedback_tokens DROP COLUMN IF EXISTS used;
ALTER TABLE feedback_tokens RENAME COLUMN used_new TO used;

-- Update indexes
DROP INDEX IF EXISTS idx_feedback_tokens_order_id;
DROP INDEX IF EXISTS idx_feedback_tokens_token;

CREATE INDEX IF NOT EXISTS feedback_tokens_order_id_idx ON feedback_tokens(order_id);
CREATE INDEX IF NOT EXISTS feedback_tokens_unused_idx ON feedback_tokens(expires_at) WHERE used = FALSE;

-- ============================================
-- 9. ALTER USERS TABLE
-- ============================================

-- Convert timestamps to WITH TIME ZONE
ALTER TABLE users 
    ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE USING updated_at AT TIME ZONE 'UTC',
    ALTER COLUMN last_login TYPE TIMESTAMP WITH TIME ZONE USING last_login AT TIME ZONE 'UTC';

-- Drop redundant indexes (unique constraints create them)
DROP INDEX IF EXISTS users_email_idx;
DROP INDEX IF EXISTS users_google_id_idx;
DROP INDEX IF EXISTS users_role_idx;

-- ============================================
-- 10. ALTER DIGEST_RUNS TABLE
-- ============================================

-- Convert timestamps to WITH TIME ZONE
ALTER TABLE digest_runs 
    ALTER COLUMN started_at TYPE TIMESTAMP WITH TIME ZONE USING started_at AT TIME ZONE 'UTC',
    ALTER COLUMN sent_at TYPE TIMESTAMP WITH TIME ZONE USING sent_at AT TIME ZONE 'UTC';

-- Convert status to enum
ALTER TABLE digest_runs ADD COLUMN IF NOT EXISTS status_new digest_status;
UPDATE digest_runs SET status_new = 
    CASE status
        WHEN 'pending' THEN 'pending'::digest_status
        WHEN 'started' THEN 'started'::digest_status
        WHEN 'running' THEN 'running'::digest_status
        WHEN 'sent' THEN 'sent'::digest_status
        WHEN 'completed' THEN 'completed'::digest_status
        WHEN 'failed' THEN 'failed'::digest_status
        ELSE 'pending'::digest_status
    END
WHERE status_new IS NULL;

ALTER TABLE digest_runs DROP COLUMN IF EXISTS status;
ALTER TABLE digest_runs RENAME COLUMN status_new TO status;
ALTER TABLE digest_runs ALTER COLUMN status SET NOT NULL;

-- ============================================
-- 11. ALTER NOTIFICATION TABLES
-- ============================================

ALTER TABLE notification_recipients 
    ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE order_reminder_state 
    ALTER COLUMN delivery_date_snapshot TYPE TIMESTAMP WITH TIME ZONE USING delivery_date_snapshot AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE USING updated_at AT TIME ZONE 'UTC';

-- ============================================
-- 12. CREATE UPDATED_AT TRIGGERS FOR NEW TABLES
-- ============================================

-- Customers table
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Categories table
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Order notes table
DROP TRIGGER IF EXISTS update_order_notes_updated_at ON order_notes;
CREATE TRIGGER update_order_notes_updated_at
    BEFORE UPDATE ON order_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Items table
DROP TRIGGER IF EXISTS update_items_updated_at ON items;
CREATE TRIGGER update_items_updated_at
    BEFORE UPDATE ON items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Order items table
DROP TRIGGER IF EXISTS update_order_items_updated_at ON order_items;
CREATE TRIGGER update_order_items_updated_at
    BEFORE UPDATE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Orders table
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 13. ANALYZE ALL TABLES
-- ============================================

ANALYZE users;
ANALYZE items;
ANALYZE item_designs;
ANALYZE orders;
ANALYZE order_items;
ANALYZE feedbacks;
ANALYZE feedback_tokens;
ANALYZE customers;
ANALYZE categories;
ANALYZE tags;
ANALYZE item_categories;
ANALYZE item_tags;
ANALYZE audit_logs;
ANALYZE order_audit_trail;
ANALYZE import_export_jobs;
ANALYZE order_notes;
ANALYZE stock_transactions;
ANALYZE notification_recipients;
ANALYZE order_reminder_state;
ANALYZE digest_runs;

COMMIT;

-- ============================================
-- ROLLBACK SCRIPT (for emergencies - run separately)
-- ============================================
-- To rollback, you would need to:
-- 1. Drop new tables: customers, categories, tags, item_categories, item_tags, 
--    audit_logs, order_audit_trail, import_export_jobs, order_notes, stock_transactions
-- 2. Drop new columns from items, orders, order_items
-- 3. Revert enum columns back to text
-- 4. Drop new enums
-- This is not provided here as rollback should be done carefully with data backup
