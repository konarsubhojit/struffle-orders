-- Migration: PostgreSQL Schema Optimization
-- Description: Implements PostgreSQL best practices for the Struffle Orders database
-- Date: 2026-01-21

-- ============================================
-- 1. Create updated_at trigger function
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- ============================================
-- 2. Apply updated_at triggers to all tables with updatedAt column
-- ============================================

-- Users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Items table
DROP TRIGGER IF EXISTS update_items_updated_at ON items;
CREATE TRIGGER update_items_updated_at
    BEFORE UPDATE ON items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Orders table
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Order items table
DROP TRIGGER IF EXISTS update_order_items_updated_at ON order_items;
CREATE TRIGGER update_order_items_updated_at
    BEFORE UPDATE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Feedbacks table
DROP TRIGGER IF EXISTS update_feedbacks_updated_at ON feedbacks;
CREATE TRIGGER update_feedbacks_updated_at
    BEFORE UPDATE ON feedbacks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Categories table
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Customers table
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Order notes table
DROP TRIGGER IF EXISTS update_order_notes_updated_at ON order_notes;
CREATE TRIGGER update_order_notes_updated_at
    BEFORE UPDATE ON order_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Notification recipients table
DROP TRIGGER IF EXISTS update_notification_recipients_updated_at ON notification_recipients;
CREATE TRIGGER update_notification_recipients_updated_at
    BEFORE UPDATE ON notification_recipients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Order reminder state table
DROP TRIGGER IF EXISTS update_order_reminder_state_updated_at ON order_reminder_state;
CREATE TRIGGER update_order_reminder_state_updated_at
    BEFORE UPDATE ON order_reminder_state
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. Enable pg_trgm extension for text search (optional, run if needed)
-- ============================================

-- CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- 4. GIN indexes for text search (optional, run if needed)
-- ============================================

-- Uncomment these if you need full-text search capability:

-- CREATE INDEX IF NOT EXISTS items_name_gin_idx 
--     ON items USING gin (name gin_trgm_ops);

-- CREATE INDEX IF NOT EXISTS customers_name_gin_idx 
--     ON customers USING gin (name gin_trgm_ops);

-- CREATE INDEX IF NOT EXISTS orders_customer_name_gin_idx 
--     ON orders USING gin (customer_name gin_trgm_ops);

-- ============================================
-- 5. Verify constraints exist (for migration from old schema)
-- ============================================

-- Note: The Drizzle schema will handle constraint creation.
-- This section is for documentation of critical constraints:

-- orders.status: Uses order_status enum
-- orders.payment_status: Uses payment_status enum
-- orders.confirmation_status: Uses confirmation_status enum
-- orders.delivery_status: Uses delivery_status enum
-- feedbacks.rating: CHECK (rating >= 1 AND rating <= 5)
-- feedbacks.product_quality: CHECK (NULL OR between 1-5)
-- feedbacks.delivery_experience: CHECK (NULL OR between 1-5)
-- order_items.quantity: CHECK (quantity > 0)
-- items.stock_quantity: CHECK (stock_quantity >= 0)
-- orders.priority: CHECK (priority >= 0 AND priority <= 10)

-- ============================================
-- 6. Table statistics for query planner
-- ============================================

ANALYZE users;
ANALYZE items;
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
