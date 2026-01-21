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
} as const;
