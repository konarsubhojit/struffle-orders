import type { ItemId, OrderId, OrderItemId, FeedbackId, FeedbackTokenId } from './brandedIds';

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
