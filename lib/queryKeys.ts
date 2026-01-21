/**
 * Centralized query key factory for TanStack Query
 * Ensures stable, consistent keys for caching and invalidation
 */

export interface ItemsPaginationParams {
  page: number;
  limit: number;
  search?: string;
}

export interface ItemsCursorParams {
  limit: number;
  cursor?: string | null;
  search?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface AnalyticsFiltersParams {
  startDate?: string;
  endDate?: string;
  timeRange?: '7d' | '30d' | '90d' | '1y' | 'all';
}

export const queryKeys = {
  // Items (cursor-based)
  items: () => ['items'] as const,
  item: (id: number | string) => ['items', 'detail', String(id)] as const,
  itemsCursor: (params: ItemsCursorParams) => ['items', 'cursor', params] as const,
  deletedItems: (params: ItemsCursorParams) => ['items', 'deleted', params] as const,

  // Orders
  ordersAll: () => ['orders', 'all'] as const,
  ordersPaginated: (params: PaginationParams) => ['orders', 'page', params] as const,
  order: (id: number | string) => ['orders', 'detail', String(id)] as const,
  priorityOrders: () => ['orders', 'priority'] as const,

  // Feedbacks
  feedbacks: () => ['feedbacks'] as const,
  feedbacksPaginated: (params: PaginationParams) => ['feedbacks', 'page', params] as const,
  feedback: (id: number | string) => ['feedbacks', 'detail', String(id)] as const,
  feedbackByOrder: (orderId: number | string) => ['feedbacks', 'byOrder', String(orderId)] as const,
  feedbackStats: () => ['feedbacks', 'stats'] as const,

  // Analytics
  salesAnalytics: (statusFilter: 'completed' | 'all') => ['analytics', 'sales', statusFilter] as const,

  // Categories
  categories: {
    all: ['categories'] as const,
    tree: ['categories', 'tree'] as const,
    detail: (id: number | string) => ['categories', 'detail', String(id)] as const,
    byItem: (itemId: number | string) => ['categories', 'byItem', String(itemId)] as const,
  },

  // Tags
  tags: {
    all: ['tags'] as const,
    detail: (id: number | string) => ['tags', 'detail', String(id)] as const,
    byItem: (itemId: number | string) => ['tags', 'byItem', String(itemId)] as const,
  },

  // Audit Logs
  auditLogs: {
    all: ['auditLogs'] as const,
    list: (filters: Record<string, unknown>) => ['auditLogs', 'list', filters] as const,
    recent: (hours: number) => ['auditLogs', 'recent', hours] as const,
    byEntity: (entityType: string, entityId: number | string) => 
      ['auditLogs', 'byEntity', entityType, String(entityId)] as const,
    orderTrail: (orderId: number | string) => ['auditLogs', 'orderTrail', String(orderId)] as const,
  },

  // Import/Export Jobs
  importExportJobs: {
    all: ['importExportJobs'] as const,
    recent: ['importExportJobs', 'recent'] as const,
    detail: (id: number | string) => ['importExportJobs', 'detail', String(id)] as const,
  },

  // Customers
  customers: {
    all: ['customers'] as const,
    list: (filters: { page?: number; limit?: number; search?: string; source?: string }) => 
      ['customers', 'list', filters] as const,
    detail: (id: number | string) => ['customers', 'detail', String(id)] as const,
    search: (query: string) => ['customers', 'search', query] as const,
    orders: (id: number | string) => ['customers', 'orders', String(id)] as const,
  },

  // Order Notes
  orderNotes: {
    all: ['orderNotes'] as const,
    byOrder: (orderId: number | string) => ['orderNotes', 'byOrder', String(orderId)] as const,
    detail: (orderId: number | string, noteId: number | string) => 
      ['orderNotes', 'detail', String(orderId), String(noteId)] as const,
  },

  // Stock Tracking
  stock: {
    all: ['stock'] as const,
    item: (itemId: number | string) => ['stock', 'item', String(itemId)] as const,
    inventory: (filters: { page?: number; limit?: number; search?: string; lowStockOnly?: boolean }) =>
      ['stock', 'inventory', filters] as const,
    lowStock: ['stock', 'lowStock'] as const,
    history: (itemId: number | string) => ['stock', 'history', String(itemId)] as const,
  },

  // Analytics (extended)
  analytics: {
    all: ['analytics'] as const,
    profit: (filters: AnalyticsFiltersParams) => ['analytics', 'profit', filters] as const,
    trends: (filters: AnalyticsFiltersParams) => ['analytics', 'trends', filters] as const,
    topItems: (filters: AnalyticsFiltersParams) => ['analytics', 'topItems', filters] as const,
    topCustomers: (filters: AnalyticsFiltersParams) => ['analytics', 'topCustomers', filters] as const,
  },
} as const;
