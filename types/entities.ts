import type { ItemId, OrderId, OrderItemId, FeedbackId, FeedbackTokenId, CategoryId, TagId, AuditLogId, OrderNoteId, CustomerId, StockTransactionId } from './brandedIds';

// Order source enum type
export type OrderSource = 'instagram' | 'facebook' | 'whatsapp' | 'call' | 'offline';

// Order status enum type
export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

// Payment status enum type
export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'cash_on_delivery' | 'refunded';

// Confirmation status enum type
export type ConfirmationStatus = 'unconfirmed' | 'pending_confirmation' | 'confirmed' | 'cancelled';

// Delivery status enum type
export type DeliveryStatus = 'not_shipped' | 'shipped' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'returned';

// Audit action enum type
export type AuditAction = 'create' | 'update' | 'delete' | 'restore' | 'bulk_import' | 'bulk_export' | 'bulk_update' | 'bulk_delete';

// Audit entity enum type
export type AuditEntityType = 'order' | 'item' | 'category' | 'tag' | 'user' | 'feedback';

// Category interface
export interface Category {
  id: CategoryId;
  _id: CategoryId;
  name: string;
  description: string | null;
  color: string;
  parentId: CategoryId | null;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  children?: Category[];
  itemCount?: number;
}

// Tag interface
export interface Tag {
  id: TagId;
  _id: TagId;
  name: string;
  color: string;
  createdAt: string;
  itemCount?: number;
}

// Item Design variant
export interface ItemDesign {
  id: number;
  _id: number;
  itemId: ItemId;
  designName: string;
  imageUrl: string;
  isPrimary: boolean;
  displayOrder: number;
  createdAt: string;
}

// Transformed types from API
export interface Item {
  id: ItemId;
  _id: ItemId;
  name: string;
  price: number;
  color: string;
  fabric: string;
  specialFeatures: string;
  imageUrl: string;
  createdAt: string;
  deletedAt: string | null;
  designs?: ItemDesign[];
  categories?: Category[];
  tags?: Tag[];
  // Stock tracking fields
  stockQuantity: number;
  lowStockThreshold: number;
  trackStock: boolean;
  // Cost/supplier fields
  costPrice: number | null;
  supplierName: string | null;
  supplierSku: string | null;
}

export interface OrderItem {
  id: OrderItemId;
  _id: OrderItemId;
  item: ItemId;
  designId?: number;
  name: string;
  price: number;
  quantity: number;
  customizationRequest: string;
}

export interface Order {
  id: OrderId;
  _id: OrderId;
  orderId: string;
  orderFrom: OrderSource;
  customerName: string;
  customerId: string;
  address: string;
  totalPrice: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  confirmationStatus: ConfirmationStatus;
  customerNotes: string;
  priority: number;
  orderDate: string | null;
  expectedDeliveryDate: string | null;
  deliveryStatus: DeliveryStatus;
  trackingId: string;
  deliveryPartner: string;
  actualDeliveryDate: string | null;
  createdAt: string;
  items: OrderItem[];
}

export interface Feedback {
  id: FeedbackId;
  _id: FeedbackId;
  orderId: OrderId;
  rating: number;
  comment: string;
  productQuality: number | null;
  deliveryExperience: number | null;
  isPublic: boolean;
  responseText: string;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackToken {
  id: FeedbackTokenId;
  orderId: OrderId;
  token: string;
  expiresAt: string;
}

// Create/Update DTOs for API
export interface CreateItemData {
  name: string;
  price: number;
  color?: string;
  fabric?: string;
  specialFeatures?: string;
  image?: string;
}

export interface UpdateItemData {
  name?: string;
  price?: number;
  color?: string;
  fabric?: string;
  specialFeatures?: string;
  image?: string | null;
}

export interface CreateOrderItemData {
  itemId: ItemId | number;
  name: string;
  price: number;
  designId?: number;
  quantity: number;
  customizationRequest?: string;
}

export interface CreateOrderData {
  orderFrom: OrderSource;
  customerName: string;
  customerId: string;
  address?: string;
  orderDate?: string;
  items: CreateOrderItemData[];
  expectedDeliveryDate?: string;
  paymentStatus?: PaymentStatus;
  paidAmount?: number;
  confirmationStatus?: ConfirmationStatus;
  customerNotes?: string;
  priority?: number;
  deliveryStatus?: DeliveryStatus;
  trackingId?: string;
  deliveryPartner?: string;
  actualDeliveryDate?: string;
}

export interface UpdateOrderData extends Partial<CreateOrderData> {
  status?: OrderStatus;
}

export interface CreateFeedbackData {
  orderId: OrderId | number;
  rating: number;
  comment?: string;
  productQuality?: number;
  deliveryExperience?: number;
  isPublic?: boolean;
}

export interface UpdateFeedbackData {
  rating?: number;
  comment?: string;
  productQuality?: number | null;
  deliveryExperience?: number | null;
  isPublic?: boolean;
  responseText?: string;
}

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface SearchPaginationParams extends PaginationParams {
  search?: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationInfo;
}

// Cursor-based pagination types
export interface CursorPaginationParams {
  limit?: number;
  cursor?: string | null;
}

export interface CursorSearchPaginationParams extends CursorPaginationParams {
  search?: string;
}

export interface CursorPageInfo {
  limit: number;
  nextCursor: string | null;
  hasMore: boolean;
}

export interface CursorPaginatedResult<T> {
  items: T[];
  pagination: CursorPageInfo;
}

// Feedback statistics
export interface FeedbackStats {
  avgRating: string | null;
  avgProductQuality: string | null;
  avgDeliveryExperience: string | null;
  totalFeedbacks: number;
}

// Token generation response
export interface TokenGenerationResponse {
  token: string;
  orderId: number;
  expiresAt: string;
}

// Token validation response
export interface TokenValidationResponse {
  order: {
    _id: OrderId;
    orderId: string;
    status: OrderStatus;
  };
  hasExistingFeedback: boolean;
}

// User types
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  provider: string;
  isGuest?: boolean;
}

export interface GuestUser {
  name: string;
  email: string;
  isGuest: true;
}

// Priority data type
export interface PriorityData {
  label: string;
  className: string;
  daysLeft?: number;
}

// Currency type
export interface Currency {
  code: string;
  symbol: string;
  name: string;
  locale: string;
}

// Notification severity type
export type NotificationSeverity = 'success' | 'error' | 'warning' | 'info';

// Form validation
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// Order form item (for creating/editing orders)
export interface OrderFormItem {
  itemId: ItemId | number;
  name: string;
  price: number;
  quantity: number;
  customizationRequest: string;
}

// Edit form for orders
export interface OrderEditForm {
  customerName: string;
  customerId: string;
  address: string;
  orderFrom: string;
  orderDate: string;
  expectedDeliveryDate: string;
  status: string;
  paymentStatus: string;
  paidAmount: number | string;
  confirmationStatus: string;
  customerNotes: string;
  priority: number;
  deliveryStatus: string;
  trackingId: string;
  deliveryPartner: string;
  actualDeliveryDate: string;
}

// API Error
export interface ApiError {
  message: string;
}

// Sales Analytics Types
export interface ItemData {
  name: string;
  quantity: number;
  revenue: number;
}

export interface CustomerData {
  customerId: string;
  customerName: string;
  orderCount: number;
  totalSpent: number;
  items: Record<string, number>;
}

export interface SourceData {
  count: number;
  revenue: number;
}

export interface RangeAnalytics {
  totalSales: number;
  orderCount: number;
  topItems: ItemData[];
  topItemsByRevenue: ItemData[];
  sourceBreakdown: Record<string, SourceData>;
  topCustomersByOrders: CustomerData[];
  topCustomersByRevenue: CustomerData[];
  highestOrderingCustomer: CustomerData | null;
  averageOrderValue: number;
  uniqueCustomers: number;
}

export interface TimeRange {
  key: string;
  label: string;
  days: number;
}

export interface SalesAnalyticsResponse {
  analytics: Record<string, RangeAnalytics>;
  timeRanges: TimeRange[];
  generatedAt: string;
}

// ============================================
// Audit Log Types
// ============================================

export interface AuditLog {
  id: AuditLogId;
  _id: AuditLogId;
  entityType: AuditEntityType;
  entityId: number;
  action: AuditAction;
  userId: number | null;
  userEmail: string | null;
  userName: string | null;
  previousData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  changedFields: string[] | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface OrderAuditEntry {
  id: number;
  _id: number;
  orderId: OrderId;
  action: string;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  userId: number | null;
  userEmail: string | null;
  userName: string | null;
  notes: string | null;
  createdAt: string;
}

export interface CreateAuditLogData {
  entityType: AuditEntityType;
  entityId: number;
  action: AuditAction;
  userId?: number;
  userEmail?: string;
  userName?: string;
  previousData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  changedFields?: string[];
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateOrderAuditData {
  orderId: number;
  action: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  userId?: number;
  userEmail?: string;
  userName?: string;
  notes?: string;
}

// ============================================
// Category & Tag Types
// ============================================

export interface CreateCategoryData {
  name: string;
  description?: string;
  color?: string;
  parentId?: number;
  displayOrder?: number;
}

export interface UpdateCategoryData {
  name?: string;
  description?: string;
  color?: string;
  parentId?: number | null;
  displayOrder?: number;
}

export interface CreateTagData {
  name: string;
  color?: string;
}

export interface UpdateTagData {
  name?: string;
  color?: string;
}

// ============================================
// Bulk Import/Export Types
// ============================================

export type ImportExportJobType = 'import' | 'export';
export type ImportExportJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ImportExportJob {
  id: number;
  _id: number;
  jobType: ImportExportJobType;
  entityType: string;
  status: ImportExportJobStatus;
  fileName: string | null;
  fileUrl: string | null;
  totalRecords: number | null;
  processedRecords: number;
  successCount: number;
  errorCount: number;
  errors: ImportError[] | null;
  userId: number | null;
  userEmail: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface ImportError {
  row: number;
  field?: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface BulkOrderImportData {
  orderFrom: OrderSource;
  customerName: string;
  customerId: string;
  address?: string;
  orderDate?: string;
  expectedDeliveryDate?: string;
  paymentStatus?: PaymentStatus;
  paidAmount?: number;
  confirmationStatus?: ConfirmationStatus;
  customerNotes?: string;
  priority?: number;
  items: Array<{
    itemName: string;
    itemId?: number;
    price: number;
    quantity: number;
    customizationRequest?: string;
  }>;
}

export interface OrderExportData {
  orderId: string;
  orderFrom: OrderSource;
  customerName: string;
  customerId: string;
  address: string;
  totalPrice: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  confirmationStatus: ConfirmationStatus;
  customerNotes: string;
  priority: number;
  orderDate: string | null;
  expectedDeliveryDate: string | null;
  deliveryStatus: DeliveryStatus;
  trackingId: string;
  deliveryPartner: string;
  actualDeliveryDate: string | null;
  createdAt: string;
  itemCount: number;
  items: string; // Semicolon-separated item names with quantities
}

// ============================================
// Report Export Types
// ============================================

export interface ExportReportOptions {
  format: 'xlsx' | 'csv';
  dateRange?: {
    start: string;
    end: string;
  };
  filters?: Record<string, unknown>;
  columns?: string[];
}

export interface ReportColumn {
  key: string;
  header: string;
  width?: number;
  format?: 'text' | 'number' | 'currency' | 'date' | 'datetime';
}

// ============================================
// Order Note Types
// ============================================

export type OrderNoteType = 'internal' | 'customer' | 'system';

export interface OrderNote {
  id: OrderNoteId;
  _id: OrderNoteId;
  orderId: OrderId;
  noteText: string;
  noteType: OrderNoteType;
  isPinned: boolean;
  userId: number | null;
  userEmail: string | null;
  userName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderNoteData {
  orderId: OrderId | number;
  noteText: string;
  noteType: OrderNoteType;
  isPinned?: boolean;
}

// ============================================
// Customer Types
// ============================================

export type CustomerSource = 'walk-in' | 'online' | 'referral' | 'other';

export interface Customer {
  id: CustomerId;
  _id: CustomerId;
  customerId: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  source: CustomerSource;
  totalOrders: number;
  totalSpent: number;
  firstOrderDate: string | null;
  lastOrderDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerSummary {
  id: CustomerId;
  customerId: string;
  name: string;
  phone: string | null;
}

export interface CreateCustomerData {
  customerId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  source?: CustomerSource;
  notes?: string;
}

export interface UpdateCustomerData {
  customerId?: string;
  name?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  source?: CustomerSource;
  notes?: string | null;
}

// ============================================
// Stock Tracking Types
// ============================================

export type StockTransactionType = 'order_placed' | 'order_cancelled' | 'adjustment' | 'restock' | 'return';

export interface StockTransaction {
  id: StockTransactionId;
  _id: StockTransactionId;
  itemId: ItemId;
  transactionType: StockTransactionType;
  quantity: number;
  previousStock: number;
  newStock: number;
  referenceType: string | null;
  referenceId: number | null;
  notes: string | null;
  userId: number | null;
  userEmail: string | null;
  createdAt: string;
}

export interface StockInfo {
  itemId: ItemId;
  itemName: string;
  stockQuantity: number;
  lowStockThreshold: number;
  trackStock: boolean;
  isLowStock: boolean;
}

// ============================================
// Profit Summary Types
// ============================================

export interface ProfitSummary {
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  profitMargin: number;
}

// ============================================
// Bulk Operations Types
// ============================================

export interface BulkUpdateOrdersData {
  orderIds: OrderId[];
  updates: {
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
  };
}
