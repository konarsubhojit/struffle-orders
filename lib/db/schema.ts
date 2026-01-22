import {
  pgTable,
  serial,
  bigserial,
  text,
  numeric,
  timestamp,
  integer,
  pgEnum,
  index,
  date,
  boolean,
  primaryKey,
  jsonb,
  customType,
  check,
  AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ============================================
// Custom Types
// ============================================

const inet = customType<{ data: string }>({
  dataType() {
    return 'inet';
  },
});

// ============================================
// Enums
// ============================================

export const orderFromEnum = pgEnum('order_from', ['instagram', 'facebook', 'whatsapp', 'call', 'offline']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'processing', 'completed', 'cancelled']);
export const paymentStatusEnum = pgEnum('payment_status', ['unpaid', 'partially_paid', 'paid', 'cash_on_delivery', 'refunded']);
export const confirmationStatusEnum = pgEnum('confirmation_status', ['unconfirmed', 'pending_confirmation', 'confirmed', 'cancelled']);
export const deliveryStatusEnum = pgEnum('delivery_status', ['not_shipped', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'returned']);
export const userRoleEnum = pgEnum('user_role', ['admin', 'user']);
export const auditActionEnum = pgEnum('audit_action', [
  'create', 'update', 'delete', 'restore', 'bulk_import', 'bulk_export', 'bulk_update', 'bulk_delete'
]);
export const auditEntityEnum = pgEnum('audit_entity', [
  'order', 'item', 'category', 'tag', 'user', 'feedback', 'customer'
]);
export const customerSourceEnum = pgEnum('customer_source', ['walk-in', 'online', 'referral', 'other']);
export const orderNoteTypeEnum = pgEnum('order_note_type', ['internal', 'customer', 'system']);
export const stockTransactionTypeEnum = pgEnum('stock_transaction_type', [
  'order_placed', 'order_cancelled', 'adjustment', 'restock', 'return'
]);
export const digestStatusEnum = pgEnum('digest_status', ['pending', 'started', 'running', 'sent', 'completed', 'failed']);
export const jobTypeEnum = pgEnum('job_type', ['import', 'export']);
export const jobStatusEnum = pgEnum('job_status', ['pending', 'processing', 'completed', 'failed']);
export const stockReferenceTypeEnum = pgEnum('stock_reference_type', ['order', 'manual', 'return', 'adjustment']);

// ============================================
// Users Table
// ============================================

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  googleId: text('google_id').notNull().unique(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  picture: text('picture'),
  role: userRoleEnum('role').default('user').notNull(),
  lastLogin: timestamp('last_login', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});
// Note: unique constraints on googleId and email already create indexes

// ============================================
// Items Table
// ============================================

export const items = pgTable('items', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  color: text('color'),
  fabric: text('fabric'),
  specialFeatures: text('special_features'),
  imageUrl: text('image_url'),
  // Stock management fields
  stockQuantity: integer('stock_quantity').default(0).notNull(),
  lowStockThreshold: integer('low_stock_threshold').default(5).notNull(),
  trackStock: boolean('track_stock').default(false).notNull(),
  // Cost and supplier fields
  costPrice: numeric('cost_price', { precision: 10, scale: 2 }),
  supplierName: text('supplier_name'),
  supplierSku: text('supplier_sku'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true })
}, (table) => [
  // Partial index for active items (soft-delete pattern)
  index('items_active_idx').on(table.id).where(sql`${table.deletedAt} IS NULL`),
  index('items_name_active_idx').on(table.name).where(sql`${table.deletedAt} IS NULL`),
  // Stock alert partial index
  index('items_low_stock_alert_idx').on(table.id).where(
    sql`${table.trackStock} = true AND ${table.stockQuantity} <= ${table.lowStockThreshold}`
  ),
  // Stock quantity for range queries
  index('items_stock_quantity_idx').on(table.stockQuantity),
  // Check constraint for non-negative stock
  check('stock_non_negative', sql`stock_quantity >= 0`)
]);

// ============================================
// Item Designs Table
// ============================================

export const itemDesigns = pgTable('item_designs', {
  id: serial('id').primaryKey(),
  itemId: integer('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  designName: text('design_name').notNull(),
  imageUrl: text('image_url').notNull(),
  isPrimary: boolean('is_primary').default(false).notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('item_designs_item_id_idx').on(table.itemId),
  // Partial index for primary designs only
  index('item_designs_primary_idx').on(table.itemId).where(sql`${table.isPrimary} = true`)
]);

// ============================================
// Customers Table (defined before orders for FK reference)
// ============================================

export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  customerId: text('customer_id').notNull().unique(), // Business identifier like "CUST-001"
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  source: customerSourceEnum('source'),
  totalOrders: integer('total_orders').default(0).notNull(),
  totalSpent: numeric('total_spent', { precision: 10, scale: 2 }).default('0').notNull(),
  firstOrderDate: timestamp('first_order_date', { withTimezone: true }),
  lastOrderDate: timestamp('last_order_date', { withTimezone: true }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  // Note: unique on customerId already creates index
  index('customers_name_idx').on(table.name),
  index('customers_email_idx').on(table.email),
  index('customers_phone_idx').on(table.phone),
  index('customers_source_idx').on(table.source),
  index('customers_last_order_date_idx').on(table.lastOrderDate)
]);

// ============================================
// Orders Table
// ============================================

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderId: text('order_id').notNull().unique(),
  orderFrom: orderFromEnum('order_from').notNull(),
  customerName: text('customer_name').notNull(),
  customerId: text('customer_id').notNull(),
  customerIdRef: integer('customer_id_ref').references(() => customers.id, { onDelete: 'set null' }),
  address: text('address'),
  totalPrice: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
  status: orderStatusEnum('status').default('pending').notNull(),
  paymentStatus: paymentStatusEnum('payment_status').default('unpaid').notNull(),
  paidAmount: numeric('paid_amount', { precision: 10, scale: 2 }).default('0').notNull(),
  confirmationStatus: confirmationStatusEnum('confirmation_status').default('unconfirmed').notNull(),
  customerNotes: text('customer_notes'),
  priority: integer('priority').default(0).notNull(),
  orderDate: timestamp('order_date', { withTimezone: true }).defaultNow().notNull(),
  expectedDeliveryDate: timestamp('expected_delivery_date', { withTimezone: true }),
  deliveryStatus: deliveryStatusEnum('delivery_status').default('not_shipped').notNull(),
  trackingId: text('tracking_id'),
  deliveryPartner: text('delivery_partner'),
  actualDeliveryDate: timestamp('actual_delivery_date', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  // Note: unique on orderId already creates index
  index('orders_customer_id_idx').on(table.customerId),
  index('orders_customer_id_ref_idx').on(table.customerIdRef),
  index('orders_delivery_date_idx').on(table.expectedDeliveryDate),
  index('orders_priority_idx').on(table.priority),
  // Composite indexes for common dashboard queries
  index('orders_status_created_idx').on(table.status, table.createdAt.desc()),
  index('orders_payment_status_created_idx').on(table.paymentStatus, table.createdAt.desc()),
  // Composite index for cursor-based pagination (created_at DESC, id DESC)
  index('orders_created_at_id_idx').on(table.createdAt.desc(), table.id.desc()),
  // Check constraint for priority
  check('priority_range', sql`priority >= 0 AND priority <= 10`)
]);

// ============================================
// Order Items Table
// ============================================

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  itemId: integer('item_id').notNull().references(() => items.id, { onDelete: 'restrict' }),
  designId: integer('design_id').references(() => itemDesigns.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  costPrice: numeric('cost_price', { precision: 10, scale: 2 }), // Snapshot of cost at order time
  quantity: integer('quantity').notNull(),
  customizationRequest: text('customization_request'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('order_items_order_id_idx').on(table.orderId),
  index('order_items_item_id_idx').on(table.itemId),
  // Check constraint for positive quantity
  check('quantity_positive', sql`quantity > 0`)
]);

// ============================================
// Feedbacks Table
// ============================================

export const feedbacks = pgTable('feedbacks', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull().unique().references(() => orders.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  productQuality: integer('product_quality'),
  deliveryExperience: integer('delivery_experience'),
  isPublic: boolean('is_public').default(true).notNull(),
  responseText: text('response_text'),
  respondedAt: timestamp('responded_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  // Note: unique on orderId already creates index
  index('feedbacks_rating_idx').on(table.rating),
  index('feedbacks_created_at_idx').on(table.createdAt),
  // Partial index for public feedbacks
  index('feedbacks_public_idx').on(table.createdAt.desc()).where(sql`${table.isPublic} = true`),
  // Check constraints for ratings
  check('rating_range', sql`rating >= 1 AND rating <= 5`),
  check('product_quality_range', sql`product_quality IS NULL OR (product_quality >= 1 AND product_quality <= 5)`),
  check('delivery_experience_range', sql`delivery_experience IS NULL OR (delivery_experience >= 1 AND delivery_experience <= 5)`)
]);

// ============================================
// Feedback Tokens Table
// ============================================

export const feedbackTokens = pgTable('feedback_tokens', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  used: boolean('used').default(false).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('feedback_tokens_order_id_idx').on(table.orderId),
  // Note: unique on token already creates index
  // Partial index for unused tokens
  index('feedback_tokens_unused_idx').on(table.expiresAt).where(sql`${table.used} = false`)
]);

// ============================================
// Notification System Tables
// ============================================

export const notificationRecipients = pgTable('notification_recipients', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  enabled: boolean('enabled').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const orderReminderState = pgTable('order_reminder_state', {
  orderId: integer('order_id').primaryKey().references(() => orders.id, { onDelete: 'cascade' }),
  deliveryDateSnapshot: timestamp('delivery_date_snapshot', { withTimezone: true }).notNull(),
  sent7d: boolean('sent_7d').default(false).notNull(),
  sent3d: boolean('sent_3d').default(false).notNull(),
  sent1d: boolean('sent_1d').default(false).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const digestRuns = pgTable('digest_runs', {
  id: serial('id').primaryKey(),
  digestDate: date('digest_date').notNull().unique(),
  status: digestStatusEnum('status').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  error: text('error')
});

// ============================================
// Item Categories & Tags System
// ============================================

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  color: text('color').default('#6B7280').notNull(), // Hex color for UI display
  parentId: integer('parent_id').references((): AnyPgColumn => categories.id, { onDelete: 'set null' }),
  displayOrder: integer('display_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  // Note: unique on name already creates index
  index('categories_parent_id_idx').on(table.parentId)
]);

export const tags = pgTable('tags', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  color: text('color').default('#3B82F6').notNull(), // Hex color for UI display
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});
// Note: unique on name already creates index, no additional indexes needed

// Junction table for item-category relationship (composite primary key)
export const itemCategories = pgTable('item_categories', {
  itemId: integer('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  categoryId: integer('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  primaryKey({ columns: [table.itemId, table.categoryId] }),
  // Reverse lookup index (categoryId -> items)
  index('item_categories_category_id_idx').on(table.categoryId)
]);

// Junction table for item-tag relationship (composite primary key)
export const itemTags = pgTable('item_tags', {
  itemId: integer('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  primaryKey({ columns: [table.itemId, table.tagId] }),
  // Reverse lookup index (tagId -> items)
  index('item_tags_tag_id_idx').on(table.tagId)
]);

// ============================================
// Audit Log System (using bigserial for high volume)
// ============================================

export const auditLogs = pgTable('audit_logs', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  entityType: auditEntityEnum('entity_type').notNull(),
  entityId: integer('entity_id').notNull(),
  action: auditActionEnum('action').notNull(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  userEmail: text('user_email'), // Cached for display even if user deleted
  userName: text('user_name'),   // Cached for display even if user deleted
  previousData: jsonb('previous_data'), // JSON object of old values
  newData: jsonb('new_data'),           // JSON object of new values
  changedFields: jsonb('changed_fields').$type<string[]>(), // Array of field names that changed
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  metadata: jsonb('metadata'), // Additional context
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  // Composite index for entity lookup (most common query pattern)
  index('audit_logs_entity_lookup_idx').on(table.entityType, table.entityId, table.createdAt.desc()),
  index('audit_logs_user_id_idx').on(table.userId),
  index('audit_logs_created_at_idx').on(table.createdAt.desc()),
  index('audit_logs_action_idx').on(table.action)
]);

// Order-specific audit trail with more detail (using bigserial)
export const orderAuditTrail = pgTable('order_audit_trail', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  orderId: integer('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  action: auditActionEnum('action').notNull(),
  fieldName: text('field_name'),    // Which field changed
  oldValue: text('old_value'),
  newValue: text('new_value'),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  userEmail: text('user_email'),
  userName: text('user_name'),
  notes: text('notes'), // Optional notes explaining the change
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  // Composite for order history queries
  index('order_audit_trail_history_idx').on(table.orderId, table.createdAt.desc()),
  index('order_audit_trail_action_idx').on(table.action)
]);

// ============================================
// Bulk Import/Export Tracking
// ============================================

export const importExportJobs = pgTable('import_export_jobs', {
  id: serial('id').primaryKey(),
  jobType: jobTypeEnum('job_type').notNull(),
  entityType: auditEntityEnum('entity_type').notNull(),
  status: jobStatusEnum('status').default('pending').notNull(),
  fileName: text('file_name'),
  fileUrl: text('file_url'), // For exports, the download URL
  totalRecords: integer('total_records'),
  processedRecords: integer('processed_records').default(0).notNull(),
  successCount: integer('success_count').default(0).notNull(),
  errorCount: integer('error_count').default(0).notNull(),
  errors: jsonb('errors').$type<Array<{ row: number; message: string }>>(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  userEmail: text('user_email'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('import_export_jobs_type_status_idx').on(table.jobType, table.status),
  index('import_export_jobs_user_id_idx').on(table.userId),
  index('import_export_jobs_created_at_idx').on(table.createdAt.desc())
]);

// ============================================
// Order Notes Table
// ============================================

export const orderNotes = pgTable('order_notes', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  noteText: text('note_text').notNull(),
  noteType: orderNoteTypeEnum('note_type').notNull(),
  isPinned: boolean('is_pinned').default(false).notNull(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  userEmail: text('user_email'),
  userName: text('user_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  // Composite for fetching order notes with pinned first
  index('order_notes_order_pinned_idx').on(table.orderId, table.isPinned.desc(), table.createdAt.desc()),
  index('order_notes_note_type_idx').on(table.noteType)
]);

// ============================================
// Stock Transactions Table (using bigserial for high volume)
// ============================================

export const stockTransactions = pgTable('stock_transactions', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  itemId: integer('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  transactionType: stockTransactionTypeEnum('transaction_type').notNull(),
  quantity: integer('quantity').notNull(), // Positive or negative
  previousStock: integer('previous_stock'),
  newStock: integer('new_stock'),
  referenceType: stockReferenceTypeEnum('reference_type'),
  referenceId: integer('reference_id'),
  notes: text('notes'),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  userEmail: text('user_email'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  // Composite for item stock history queries
  index('stock_transactions_item_history_idx').on(table.itemId, table.createdAt.desc()),
  index('stock_transactions_type_idx').on(table.transactionType),
  index('stock_transactions_reference_idx').on(table.referenceType, table.referenceId)
]);
