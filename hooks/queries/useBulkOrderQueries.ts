'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import type { 
  OrderId, 
  OrderStatus, 
  PaymentStatus 
} from '@/types';

// Bulk update data types
export interface BulkUpdateOrdersData {
  orderIds: OrderId[] | number[];
  updates: {
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    deliveryStatus?: string;
    confirmationStatus?: string;
  };
}

export interface BulkDeleteOrdersData {
  orderIds: OrderId[] | number[];
}

export interface BulkOperationResult {
  success: boolean;
  processedCount: number;
  errorCount: number;
  errors?: Array<{ id: number; message: string }>;
}

// API client functions
async function bulkUpdateOrders(data: BulkUpdateOrdersData): Promise<BulkOperationResult> {
  const response = await fetch('/api/orders/bulk/update', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to bulk update orders');
  }
  return response.json();
}

async function bulkDeleteOrders(data: BulkDeleteOrdersData): Promise<BulkOperationResult> {
  const response = await fetch('/api/orders/bulk/delete', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to bulk delete orders');
  }
  return response.json();
}

// Mutation hooks
export function useBulkUpdateOrders() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: bulkUpdateOrders,
    onSuccess: () => {
      // Invalidate all order-related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.ordersAll() });
      queryClient.invalidateQueries({ queryKey: queryKeys.priorityOrders() });
      // Invalidate analytics as order statuses may have changed
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
    },
  });
}

export function useBulkDeleteOrders() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: bulkDeleteOrders,
    onSuccess: () => {
      // Invalidate all order-related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.ordersAll() });
      queryClient.invalidateQueries({ queryKey: queryKeys.priorityOrders() });
      // Invalidate analytics as orders were deleted
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
      // Invalidate audit logs
      queryClient.invalidateQueries({ queryKey: queryKeys.auditLogs.all });
    },
  });
}
