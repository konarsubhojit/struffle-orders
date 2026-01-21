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
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
  googleIdIdx: index('users_google_id_idx').on(table.googleId),
  roleIdx: index('users_role_idx').on(table.role)
}));

export const items = pgTable('items', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  color: text('color'),
  fabric: text('fabric'),
  specialFeatures: text('special_features'),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at')
}, (table) => ({
  // Performance indexes for common queries (as per ARCHITECTURE_ANALYSIS.md)
  nameIdx: index('items_name_idx').on(table.name),
  deletedAtIdx: index('items_deleted_at_idx').on(table.deletedAt)
}));

export const itemDesigns = pgTable('item_designs', {
  id: serial('id').primaryKey(),
  itemId: integer('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  designName: text('design_name').notNull(),
  imageUrl: text('image_url').notNull(),
  isPrimary: boolean('is_primary').default(false).notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  itemIdIdx: index('item_designs_item_id_idx').on(table.itemId),
  isPrimaryIdx: index('item_designs_is_primary_idx').on(table.isPrimary)
}));

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderId: text('order_id').notNull().unique(),
  orderFrom: orderFromEnum('order_from').notNull(),
  customerName: text('customer_name').notNull(),
  customerId: text('customer_id').notNull(),
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
}, (table) => ({
  // Performance indexes for filtered queries (as per ARCHITECTURE_ANALYSIS.md)
  orderIdIdx: index('orders_order_id_idx').on(table.orderId),
  customerIdIdx: index('orders_customer_id_idx').on(table.customerId),
  deliveryDateIdx: index('orders_delivery_date_idx').on(table.expectedDeliveryDate),
  priorityIdx: index('orders_priority_idx').on(table.priority),
  statusIdx: index('orders_status_idx').on(table.status),
  // Index for pagination ORDER BY created_at DESC
  createdAtIdx: index('orders_created_at_idx').on(table.createdAt),
  // Composite index for cursor-based pagination (created_at DESC, id DESC)
  // This enables stable, efficient cursor pagination with no duplicates/skips
  createdAtIdIdx: index('orders_created_at_id_idx').on(table.createdAt.desc(), table.id.desc())
}));

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  itemId: integer('item_id').notNull().references(() => items.id),
  designId: integer('design_id').references(() => itemDesigns.id),
  name: text('name').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  quantity: integer('quantity').notNull(),
  customizationRequest: text('customization_request')
}, (table) => ({
  // Index for efficient order items lookup by order_id
  orderIdIdx: index('order_items_order_id_idx').on(table.orderId)
}));

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
}, (table) => ({
  // Performance indexes as per ARCHITECTURE_OPTIMIZATION.md
  orderIdIdx: index('idx_feedbacks_order_id').on(table.orderId),
  ratingIdx: index('idx_feedbacks_rating').on(table.rating),
  createdAtIdx: index('idx_feedbacks_created_at').on(table.createdAt),
  isPublicIdx: index('idx_feedbacks_is_public').on(table.isPublic)
}));

export const feedbackTokens = pgTable('feedback_tokens', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  used: integer('used').default(0),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  // Performance indexes as per ARCHITECTURE_OPTIMIZATION.md
  orderIdIdx: index('idx_feedback_tokens_order_id').on(table.orderId),
  tokenIdx: index('idx_feedback_tokens_token').on(table.token)
}));

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
