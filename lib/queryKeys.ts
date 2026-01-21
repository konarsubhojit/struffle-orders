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
} as const;
