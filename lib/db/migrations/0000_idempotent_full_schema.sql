-- ============================================
-- Struffle Orders - Full Idempotent Schema Migration
-- ============================================
-- Description: Complete database schema for Struffle Orders application
-- This script is fully idempotent and can be run multiple times safely.
-- It will create all objects if they don't exist and skip if they do.
-- 
-- Usage: psql -d your_database -f 0000_idempotent_full_schema.sql
-- 
-- Last Updated: 2026-01-23
-- ============================================

-- ============================================
-- 1. ENUMS
-- ============================================

DO $$ BEGIN
    CREATE TYPE order_from AS ENUM ('instagram', 'facebook', 'whatsapp', 'call', 'offline');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('pending', 'processing', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

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
    CREATE TYPE user_role AS ENUM ('admin', 'user');
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
-- 2. TRIGGER FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. TABLES
-- ============================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    google_id TEXT NOT NULL,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    picture TEXT,
    role user_role NOT NULL DEFAULT 'user',
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add unique constraints if not exist
DO $$ BEGIN
    ALTER TABLE users ADD CONSTRAINT users_google_id_unique UNIQUE (google_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Items table
CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    color TEXT,
    fabric TEXT,
    special_features TEXT,
    image_url TEXT,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER NOT NULL DEFAULT 5,
    track_stock BOOLEAN NOT NULL DEFAULT FALSE,
    cost_price NUMERIC(10, 2),
    supplier_name TEXT,
    supplier_sku TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Add columns if they don't exist (for migration from older schema)
DO $$ BEGIN
    ALTER TABLE items ADD COLUMN stock_quantity INTEGER NOT NULL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE items ADD COLUMN low_stock_threshold INTEGER NOT NULL DEFAULT 5;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE items ADD COLUMN track_stock BOOLEAN NOT NULL DEFAULT FALSE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE items ADD COLUMN cost_price NUMERIC(10, 2);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE items ADD COLUMN supplier_name TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE items ADD COLUMN supplier_sku TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE items ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Item Designs table
CREATE TABLE IF NOT EXISTS item_designs (
    id SERIAL PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    design_name TEXT NOT NULL,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    customer_id TEXT NOT NULL,
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

DO $$ BEGIN
    ALTER TABLE customers ADD CONSTRAINT customers_customer_id_unique UNIQUE (customer_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_id TEXT NOT NULL,
    order_from order_from NOT NULL,
    customer_name TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    customer_id_ref INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    address TEXT,
    total_price NUMERIC(10, 2) NOT NULL,
    status order_status NOT NULL DEFAULT 'pending',
    payment_status payment_status NOT NULL DEFAULT 'unpaid',
    paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    confirmation_status confirmation_status NOT NULL DEFAULT 'unconfirmed',
    customer_notes TEXT,
    priority INTEGER NOT NULL DEFAULT 0,
    order_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expected_delivery_date TIMESTAMP WITH TIME ZONE,
    delivery_status delivery_status NOT NULL DEFAULT 'not_shipped',
    tracking_id TEXT,
    delivery_partner TEXT,
    actual_delivery_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$ BEGIN
    ALTER TABLE orders ADD CONSTRAINT orders_order_id_unique UNIQUE (order_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add columns if they don't exist (for migration from older schema)
DO $$ BEGIN
    ALTER TABLE orders ADD COLUMN customer_id_ref INTEGER REFERENCES customers(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE orders ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Order Items table
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    design_id INTEGER REFERENCES item_designs(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    cost_price NUMERIC(10, 2),
    quantity INTEGER NOT NULL,
    customization_request TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$ BEGIN
    ALTER TABLE order_items ADD COLUMN cost_price NUMERIC(10, 2);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE order_items ADD COLUMN created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE order_items ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Feedbacks table
CREATE TABLE IF NOT EXISTS feedbacks (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL,
    comment TEXT,
    product_quality INTEGER,
    delivery_experience INTEGER,
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    response_text TEXT,
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$ BEGIN
    ALTER TABLE feedbacks ADD CONSTRAINT feedbacks_order_id_unique UNIQUE (order_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Feedback Tokens table
CREATE TABLE IF NOT EXISTS feedback_tokens (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$ BEGIN
    ALTER TABLE feedback_tokens ADD CONSTRAINT feedback_tokens_token_unique UNIQUE (token);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Notification Recipients table
CREATE TABLE IF NOT EXISTS notification_recipients (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$ BEGIN
    ALTER TABLE notification_recipients ADD CONSTRAINT notification_recipients_email_unique UNIQUE (email);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Order Reminder State table
CREATE TABLE IF NOT EXISTS order_reminder_state (
    order_id INTEGER PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
    delivery_date_snapshot TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_7d BOOLEAN NOT NULL DEFAULT FALSE,
    sent_3d BOOLEAN NOT NULL DEFAULT FALSE,
    sent_1d BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Digest Runs table
CREATE TABLE IF NOT EXISTS digest_runs (
    id SERIAL PRIMARY KEY,
    digest_date DATE NOT NULL,
    status digest_status NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP WITH TIME ZONE,
    error TEXT
);

DO $$ BEGIN
    ALTER TABLE digest_runs ADD CONSTRAINT digest_runs_digest_date_unique UNIQUE (digest_date);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT NOT NULL DEFAULT '#6B7280',
    parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$ BEGIN
    ALTER TABLE categories ADD CONSTRAINT categories_name_unique UNIQUE (name);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#3B82F6',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$ BEGIN
    ALTER TABLE tags ADD CONSTRAINT tags_name_unique UNIQUE (name);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Item Categories junction table
CREATE TABLE IF NOT EXISTS item_categories (
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (item_id, category_id)
);

-- Item Tags junction table
CREATE TABLE IF NOT EXISTS item_tags (
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (item_id, tag_id)
);

-- Audit Logs table
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

-- Order Audit Trail table
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

-- Stock Transactions table
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

-- ============================================
-- 4. CHECK CONSTRAINTS
-- ============================================

DO $$ BEGIN
    ALTER TABLE items ADD CONSTRAINT stock_non_negative CHECK (stock_quantity >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE orders ADD CONSTRAINT priority_range CHECK (priority >= 0 AND priority <= 10);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE order_items ADD CONSTRAINT quantity_positive CHECK (quantity > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE feedbacks ADD CONSTRAINT rating_range CHECK (rating >= 1 AND rating <= 5);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE feedbacks ADD CONSTRAINT product_quality_range CHECK (product_quality IS NULL OR (product_quality >= 1 AND product_quality <= 5));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE feedbacks ADD CONSTRAINT delivery_experience_range CHECK (delivery_experience IS NULL OR (delivery_experience >= 1 AND delivery_experience <= 5));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 5. INDEXES
-- ============================================

-- Items indexes
CREATE INDEX IF NOT EXISTS items_active_idx ON items(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS items_name_active_idx ON items(name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS items_low_stock_alert_idx ON items(id) WHERE track_stock = TRUE AND stock_quantity <= low_stock_threshold;
CREATE INDEX IF NOT EXISTS items_stock_quantity_idx ON items(stock_quantity);

-- Item Designs indexes
CREATE INDEX IF NOT EXISTS item_designs_item_id_idx ON item_designs(item_id);
CREATE INDEX IF NOT EXISTS item_designs_primary_idx ON item_designs(item_id) WHERE is_primary = TRUE;

-- Customers indexes
CREATE INDEX IF NOT EXISTS customers_name_idx ON customers(name);
CREATE INDEX IF NOT EXISTS customers_email_idx ON customers(email);
CREATE INDEX IF NOT EXISTS customers_phone_idx ON customers(phone);
CREATE INDEX IF NOT EXISTS customers_source_idx ON customers(source);
CREATE INDEX IF NOT EXISTS customers_last_order_date_idx ON customers(last_order_date);

-- Orders indexes
CREATE INDEX IF NOT EXISTS orders_customer_id_idx ON orders(customer_id);
CREATE INDEX IF NOT EXISTS orders_customer_id_ref_idx ON orders(customer_id_ref);
CREATE INDEX IF NOT EXISTS orders_delivery_date_idx ON orders(expected_delivery_date);
CREATE INDEX IF NOT EXISTS orders_priority_idx ON orders(priority);
CREATE INDEX IF NOT EXISTS orders_status_created_idx ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_payment_status_created_idx ON orders(payment_status, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_created_at_id_idx ON orders(created_at DESC, id DESC);

-- Order Items indexes
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items(order_id);
CREATE INDEX IF NOT EXISTS order_items_item_id_idx ON order_items(item_id);

-- Feedbacks indexes
CREATE INDEX IF NOT EXISTS feedbacks_rating_idx ON feedbacks(rating);
CREATE INDEX IF NOT EXISTS feedbacks_created_at_idx ON feedbacks(created_at);
CREATE INDEX IF NOT EXISTS feedbacks_public_idx ON feedbacks(created_at DESC) WHERE is_public = TRUE;

-- Feedback Tokens indexes
CREATE INDEX IF NOT EXISTS feedback_tokens_order_id_idx ON feedback_tokens(order_id);
CREATE INDEX IF NOT EXISTS feedback_tokens_unused_idx ON feedback_tokens(expires_at) WHERE used = FALSE;

-- Categories indexes
CREATE INDEX IF NOT EXISTS categories_parent_id_idx ON categories(parent_id);

-- Item Categories indexes
CREATE INDEX IF NOT EXISTS item_categories_category_id_idx ON item_categories(category_id);

-- Item Tags indexes
CREATE INDEX IF NOT EXISTS item_tags_tag_id_idx ON item_tags(tag_id);

-- Audit Logs indexes
CREATE INDEX IF NOT EXISTS audit_logs_entity_lookup_idx ON audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs(action);

-- Order Audit Trail indexes
CREATE INDEX IF NOT EXISTS order_audit_trail_history_idx ON order_audit_trail(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS order_audit_trail_action_idx ON order_audit_trail(action);

-- Import/Export Jobs indexes
CREATE INDEX IF NOT EXISTS import_export_jobs_type_status_idx ON import_export_jobs(job_type, status);
CREATE INDEX IF NOT EXISTS import_export_jobs_user_id_idx ON import_export_jobs(user_id);
CREATE INDEX IF NOT EXISTS import_export_jobs_created_at_idx ON import_export_jobs(created_at DESC);

-- Order Notes indexes
CREATE INDEX IF NOT EXISTS order_notes_order_pinned_idx ON order_notes(order_id, is_pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS order_notes_note_type_idx ON order_notes(note_type);

-- Stock Transactions indexes
CREATE INDEX IF NOT EXISTS stock_transactions_item_history_idx ON stock_transactions(item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS stock_transactions_type_idx ON stock_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS stock_transactions_reference_idx ON stock_transactions(reference_type, reference_id);

-- ============================================
-- 6. TRIGGERS
-- ============================================

-- Users
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Items
DROP TRIGGER IF EXISTS update_items_updated_at ON items;
CREATE TRIGGER update_items_updated_at
    BEFORE UPDATE ON items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Orders
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Order Items
DROP TRIGGER IF EXISTS update_order_items_updated_at ON order_items;
CREATE TRIGGER update_order_items_updated_at
    BEFORE UPDATE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Feedbacks
DROP TRIGGER IF EXISTS update_feedbacks_updated_at ON feedbacks;
CREATE TRIGGER update_feedbacks_updated_at
    BEFORE UPDATE ON feedbacks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Categories
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Customers
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Order Notes
DROP TRIGGER IF EXISTS update_order_notes_updated_at ON order_notes;
CREATE TRIGGER update_order_notes_updated_at
    BEFORE UPDATE ON order_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Notification Recipients
DROP TRIGGER IF EXISTS update_notification_recipients_updated_at ON notification_recipients;
CREATE TRIGGER update_notification_recipients_updated_at
    BEFORE UPDATE ON notification_recipients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Order Reminder State
DROP TRIGGER IF EXISTS update_order_reminder_state_updated_at ON order_reminder_state;
CREATE TRIGGER update_order_reminder_state_updated_at
    BEFORE UPDATE ON order_reminder_state
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. ANALYZE TABLES FOR QUERY PLANNER
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

-- ============================================
-- 8. OPTIONAL: TEXT SEARCH EXTENSION
-- ============================================
-- Uncomment if you need trigram text search:
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX IF NOT EXISTS items_name_gin_idx ON items USING gin (name gin_trgm_ops);
-- CREATE INDEX IF NOT EXISTS customers_name_gin_idx ON customers USING gin (name gin_trgm_ops);
-- CREATE INDEX IF NOT EXISTS orders_customer_name_gin_idx ON orders USING gin (customer_name gin_trgm_ops);

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- This script has been executed successfully.
-- All tables, enums, indexes, constraints, and triggers are now in place.
