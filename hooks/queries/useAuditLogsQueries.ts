'use client';

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import type { AuditLog, OrderAuditEntry, OrderId } from '@/types';

interface AuditLogsFilters {
  entityType?: string;
  entityId?: number;
  action?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}

interface AuditLogsResponse {
  items: AuditLog[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

interface RecentActivityResponse {
  logs: AuditLog[];
  summary: {
    total: number;
    byAction: Record<string, number>;
    byEntity: Record<string, number>;
  };
}

// API client functions
async function fetchAuditLogs(
  page: number = 1,
  limit: number = 50,
  filters: AuditLogsFilters = {}
): Promise<AuditLogsResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  
  if (filters.entityType) params.set('entityType', filters.entityType);
  if (filters.entityId) params.set('entityId', filters.entityId.toString());
  if (filters.action) params.set('action', filters.action);
  if (filters.userId) params.set('userId', filters.userId);
  if (filters.startDate) params.set('startDate', filters.startDate.toISOString());
  if (filters.endDate) params.set('endDate', filters.endDate.toISOString());

  const response = await fetch(`/api/audit-logs?${params.toString()}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch audit logs');
  }
  return response.json();
}

async function fetchRecentActivity(
  hours: number = 24,
  limit: number = 50
): Promise<RecentActivityResponse> {
  const params = new URLSearchParams({
    hours: hours.toString(),
    limit: limit.toString(),
  });

  const response = await fetch(`/api/audit-logs/recent?${params.toString()}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch recent activity');
  }
  return response.json();
}

async function fetchOrderAuditTrail(orderId: OrderId): Promise<OrderAuditEntry[]> {
  const response = await fetch(`/api/orders/${orderId}/audit`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch order audit trail');
  }
  return response.json();
}

// Query hooks
export function useAuditLogs(filters: AuditLogsFilters = {}, limit: number = 50) {
  return useInfiniteQuery({
    queryKey: queryKeys.auditLogs.list(filters as Record<string, unknown>),
    queryFn: ({ pageParam = 1 }) => fetchAuditLogs(pageParam, limit, filters),
    getNextPageParam: (lastPage) => 
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useRecentActivity(hours: number = 24, limit: number = 50) {
  return useQuery({
    queryKey: queryKeys.auditLogs.recent(hours),
    queryFn: () => fetchRecentActivity(hours, limit),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  });
}

export function useOrderAuditTrail(orderId: OrderId | null) {
  return useQuery({
    queryKey: queryKeys.auditLogs.orderTrail(orderId!),
    queryFn: () => fetchOrderAuditTrail(orderId!),
    enabled: !!orderId,
    staleTime: 30 * 1000,
  });
}
