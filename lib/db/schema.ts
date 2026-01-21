import { pgTable, serial, text, numeric, timestamp, integer, pgEnum, index, date, boolean } from 'drizzle-orm/pg-core';

export const orderFromEnum = pgEnum('order_from', ['instagram', 'facebook', 'whatsapp', 'call', 'offline']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'processing', 'completed', 'cancelled']);
export const userRoleEnum = pgEnum('user_role', ['admin', 'user']);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  googleId: text('google_id').notNull().unique(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  picture: text('picture'),
  role: userRoleEnum('role').default('user').notNull(),
  lastLogin: timestamp('last_login'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => [
  index('users_email_idx').on(table.email),
  index('users_google_id_idx').on(table.googleId),
  index('users_role_idx').on(table.role)
]);

export const items = pgTable('items', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  color: text('color'),
  fabric: text('fabric'),
  specialFeatures: text('special_features'),
  imageUrl: text('image_url'),
  // Stock management fields
  stockQuantity: integer('stock_quantity').default(0),
  lowStockThreshold: integer('low_stock_threshold').default(5),
  trackStock: boolean('track_stock').default(false),
  // Cost and supplier fields
  costPrice: numeric('cost_price', { precision: 10, scale: 2 }),
  supplierName: text('supplier_name'),
  supplierSku: text('supplier_sku'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at')
}, (table) => [
  // Performance indexes for common queries (as per ARCHITECTURE_ANALYSIS.md)
  index('items_name_idx').on(table.name),
  index('items_deleted_at_idx').on(table.deletedAt),
  // Stock management indexes
  index('items_track_stock_idx').on(table.trackStock),
  index('items_low_stock_idx').on(table.stockQuantity, table.lowStockThreshold)
]);

export const itemDesigns = pgTable('item_designs', {
  id: serial('id').primaryKey(),
  itemId: integer('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  designName: text('design_name').notNull(),
  imageUrl: text('image_url').notNull(),
  isPrimary: boolean('is_primary').default(false).notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => [
  index('item_designs_item_id_idx').on(table.itemId),
  index('item_designs_is_primary_idx').on(table.isPrimary)
]);

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderId: text('order_id').notNull().unique(),
  orderFrom: orderFromEnum('order_from').notNull(),
  customerName: text('customer_name').notNull(),
  customerId: text('customer_id').notNull(),
  customerIdRef: integer('customer_id_ref'), // FK to customers table
  address: text('address'),
  totalPrice: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
  status: text('status').default('pending'),
  paymentStatus: text('payment_status').default('unpaid'),
  paidAmount: numeric('paid_amount', { precision: 10, scale: 2 }).default('0'),
  confirmationStatus: text('confirmation_status').default('unconfirmed'),
  customerNotes: text('customer_notes'),
  priority: integer('priority').default(0),
  orderDate: timestamp('order_date'),
  expectedDeliveryDate: timestamp('expected_delivery_date'),
  deliveryStatus: text('delivery_status').default('not_shipped'),
  trackingId: text('tracking_id'),
  deliveryPartner: text('delivery_partner'),
  actualDeliveryDate: timestamp('actual_delivery_date'),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => [
  // Performance indexes for filtered queries (as per ARCHITECTURE_ANALYSIS.md)
  index('orders_order_id_idx').on(table.orderId),
  index('orders_customer_id_idx').on(table.customerId),
  index('orders_delivery_date_idx').on(table.expectedDeliveryDate),
  index('orders_priority_idx').on(table.priority),
  index('orders_status_idx').on(table.status),
  // Index for pagination ORDER BY created_at DESC
  index('orders_created_at_idx').on(table.createdAt),
  // Composite index for cursor-based pagination (created_at DESC, id DESC)
  // This enables stable, efficient cursor pagination with no duplicates/skips
  index('orders_created_at_id_idx').on(table.createdAt.desc(), table.id.desc())
]);

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  itemId: integer('item_id').notNull().references(() => items.id),
  designId: integer('design_id').references(() => itemDesigns.id),
  name: text('name').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  costPrice: numeric('cost_price', { precision: 10, scale: 2 }), // Snapshot of cost at order time
  quantity: integer('quantity').notNull(),
  customizationRequest: text('customization_request')
}, (table) => [
  // Index for efficient order items lookup by order_id
  index('order_items_order_id_idx').on(table.orderId)
]);

export const feedbacks = pgTable('feedbacks', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  productQuality: integer('product_quality'),
  deliveryExperience: integer('delivery_experience'),
  isPublic: integer('is_public').default(1),
  responseText: text('response_text'),
  respondedAt: timestamp('responded_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => [
  // Performance indexes as per ARCHITECTURE_OPTIMIZATION.md
  index('idx_feedbacks_order_id').on(table.orderId),
  index('idx_feedbacks_rating').on(table.rating),
  index('idx_feedbacks_created_at').on(table.createdAt),
  index('idx_feedbacks_is_public').on(table.isPublic)
]);

export const feedbackTokens = pgTable('feedback_tokens', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  used: integer('used').default(0),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => [
  // Performance indexes as per ARCHITECTURE_OPTIMIZATION.md
  index('idx_feedback_tokens_order_id').on(table.orderId),
  index('idx_feedback_tokens_token').on(table.token)
]);

// Daily digest notification system tables

export const notificationRecipients = pgTable('notification_recipients', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  enabled: boolean('enabled').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const orderReminderState = pgTable('order_reminder_state', {
  orderId: integer('order_id').primaryKey().references(() => orders.id, { onDelete: 'cascade' }),
  deliveryDateSnapshot: timestamp('delivery_date_snapshot').notNull(),
  sent7d: boolean('sent_7d').default(false).notNull(),
  sent3d: boolean('sent_3d').default(false).notNull(),
  sent1d: boolean('sent_1d').default(false).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const digestRuns = pgTable('digest_runs', {
  id: serial('id').primaryKey(),
  digestDate: date('digest_date').notNull().unique(),
  status: text('status').notNull(),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  sentAt: timestamp('sent_at'),
  error: text('error')
});

// ============================================
// Item Categories & Tags System
// ============================================

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  color: text('color').default('#6B7280'), // Hex color for UI display
  parentId: integer('parent_id'),
  displayOrder: integer('display_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => [
  index('categories_name_idx').on(table.name),
  index('categories_parent_id_idx').on(table.parentId)
]);

export const tags = pgTable('tags', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  color: text('color').default('#3B82F6'), // Hex color for UI display
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => [
  index('tags_name_idx').on(table.name)
]);

// Junction table for item-category relationship (many-to-many)
export const itemCategories = pgTable('item_categories', {
  id: serial('id').primaryKey(),
  itemId: integer('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  categoryId: integer('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => [
  index('item_categories_item_id_idx').on(table.itemId),
  index('item_categories_category_id_idx').on(table.categoryId),
  index('item_categories_unique_idx').on(table.itemId, table.categoryId)
]);

// Junction table for item-tag relationship (many-to-many)
export const itemTags = pgTable('item_tags', {
  id: serial('id').primaryKey(),
  itemId: integer('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => [
  index('item_tags_item_id_idx').on(table.itemId),
  index('item_tags_tag_id_idx').on(table.tagId),
  index('item_tags_unique_idx').on(table.itemId, table.tagId)
]);

// ============================================
// Audit Log System
// ============================================

export const auditActionEnum = pgEnum('audit_action', [
  'create', 'update', 'delete', 'restore', 'bulk_import', 'bulk_export', 'bulk_update', 'bulk_delete'
]);

export const auditEntityEnum = pgEnum('audit_entity', [
  'order', 'item', 'category', 'tag', 'user', 'feedback'
]);

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  entityType: auditEntityEnum('entity_type').notNull(),
  entityId: integer('entity_id').notNull(),
  action: auditActionEnum('action').notNull(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  userEmail: text('user_email'), // Cached for display even if user deleted
  userName: text('user_name'),   // Cached for display even if user deleted
  previousData: text('previous_data'), // JSON string of old values
  newData: text('new_data'),           // JSON string of new values
  changedFields: text('changed_fields'), // JSON array of field names that changed
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  metadata: text('metadata'), // Additional context as JSON
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => [
  index('audit_logs_entity_type_idx').on(table.entityType),
  index('audit_logs_entity_id_idx').on(table.entityId),
  index('audit_logs_action_idx').on(table.action),
  index('audit_logs_user_id_idx').on(table.userId),
  index('audit_logs_created_at_idx').on(table.createdAt),
  // Composite index for entity lookup (most common query pattern)
  index('audit_logs_entity_lookup_idx').on(table.entityType, table.entityId, table.createdAt)
]);

// Order-specific audit trail with more detail
export const orderAuditTrail = pgTable('order_audit_trail', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  action: text('action').notNull(), // More flexible: 'status_change', 'payment_update', 'item_added', etc.
  fieldName: text('field_name'),    // Which field changed
  oldValue: text('old_value'),
  newValue: text('new_value'),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  userEmail: text('user_email'),
  userName: text('user_name'),
  notes: text('notes'), // Optional notes explaining the change
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => [
  index('order_audit_trail_order_id_idx').on(table.orderId),
  index('order_audit_trail_action_idx').on(table.action),
  index('order_audit_trail_created_at_idx').on(table.createdAt),
  // Composite for order history queries
  index('order_audit_trail_history_idx').on(table.orderId, table.createdAt)
]);

// ============================================
// Bulk Import/Export Tracking
// ============================================

export const importExportJobs = pgTable('import_export_jobs', {
  id: serial('id').primaryKey(),
  jobType: text('job_type').notNull(), // 'import' or 'export'
  entityType: text('entity_type').notNull(), // 'orders', 'items', etc.
  status: text('status').notNull().default('pending'), // 'pending', 'processing', 'completed', 'failed'
  fileName: text('file_name'),
  fileUrl: text('file_url'), // For exports, the download URL
  totalRecords: integer('total_records'),
  processedRecords: integer('processed_records').default(0),
  successCount: integer('success_count').default(0),
  errorCount: integer('error_count').default(0),
  errors: text('errors'), // JSON array of error details
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  userEmail: text('user_email'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => [
  index('import_export_jobs_type_idx').on(table.jobType),
  index('import_export_jobs_status_idx').on(table.status),
  index('import_export_jobs_user_id_idx').on(table.userId),
  index('import_export_jobs_created_at_idx').on(table.createdAt)
]);

// ============================================
// Customers Table
// ============================================

export const customerSourceEnum = pgEnum('customer_source', ['walk-in', 'online', 'referral', 'other']);

export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  customerId: text('customer_id').notNull().unique(), // Business identifier like "CUST-001"
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  source: customerSourceEnum('source'),
  totalOrders: integer('total_orders').default(0),
  totalSpent: numeric('total_spent', { precision: 10, scale: 2 }).default('0'),
  firstOrderDate: timestamp('first_order_date'),
  lastOrderDate: timestamp('last_order_date'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => [
  index('customers_customer_id_idx').on(table.customerId),
  index('customers_name_idx').on(table.name),
  index('customers_email_idx').on(table.email),
  index('customers_phone_idx').on(table.phone),
  index('customers_source_idx').on(table.source),
  index('customers_last_order_date_idx').on(table.lastOrderDate)
]);

// ============================================
// Order Notes Table
// ============================================

export const orderNoteTypeEnum = pgEnum('order_note_type', ['internal', 'customer', 'system']);

export const orderNotes = pgTable('order_notes', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  noteText: text('note_text').notNull(),
  noteType: orderNoteTypeEnum('note_type').notNull(),
  isPinned: boolean('is_pinned').default(false),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  userEmail: text('user_email'),
  userName: text('user_name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => [
  index('order_notes_order_id_idx').on(table.orderId),
  index('order_notes_note_type_idx').on(table.noteType),
  index('order_notes_is_pinned_idx').on(table.isPinned),
  index('order_notes_created_at_idx').on(table.createdAt),
  // Composite for fetching pinned notes first, then by date
  index('order_notes_order_pinned_idx').on(table.orderId, table.isPinned, table.createdAt)
]);

// ============================================
// Stock Transactions Table
// ============================================

export const stockTransactionTypeEnum = pgEnum('stock_transaction_type', [
  'order_placed', 'order_cancelled', 'adjustment', 'restock', 'return'
]);

export const stockTransactions = pgTable('stock_transactions', {
  id: serial('id').primaryKey(),
  itemId: integer('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  transactionType: stockTransactionTypeEnum('transaction_type').notNull(),
  quantity: integer('quantity').notNull(), // Positive or negative
  previousStock: integer('previous_stock'),
  newStock: integer('new_stock'),
  referenceType: text('reference_type'), // e.g., 'order'
  referenceId: integer('reference_id'),
  notes: text('notes'),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  userEmail: text('user_email'),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => [
  index('stock_transactions_item_id_idx').on(table.itemId),
  index('stock_transactions_type_idx').on(table.transactionType),
  index('stock_transactions_reference_idx').on(table.referenceType, table.referenceId),
  index('stock_transactions_created_at_idx').on(table.createdAt),
  // Composite for item stock history queries
  index('stock_transactions_item_history_idx').on(table.itemId, table.createdAt)
]);
