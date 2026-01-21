import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import * as api from '@/lib/api/client';
import { queryKeys } from '@/lib/queryKeys';
import type { Order, CreateOrderData, UpdateOrderData, OrderId } from '@/types';

/**
 * Mutation hook for creating an order
 * Invalidates orders and analytics caches on success
 */
export function useCreateOrder(): UseMutationResult<Order, Error, CreateOrderData> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => api.createOrder(data),
    onSuccess: () => {
      // Invalidate all orders-related queries
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      // Invalidate analytics since orders affect sales data
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

/**
 * Mutation hook for updating an order
 * Uses returned data to update cache directly, then invalidates list queries
 */
export function useUpdateOrder(): UseMutationResult<Order, Error, { id: OrderId; data: UpdateOrderData }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => api.updateOrder(id, data),
    onSuccess: (updatedOrder, { id }) => {
      // Directly set the updated order data in cache to avoid refetch race condition
      queryClient.setQueryData(queryKeys.order(id), updatedOrder);
      
      // Invalidate list queries (orders, feedbacks, analytics) so they refetch
      // But don't invalidate the single order query we just updated
      queryClient.invalidateQueries({ 
        queryKey: ['orders'],
        refetchType: 'none', // Don't refetch immediately, just mark as stale
      });
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      
      // Trigger background refetch for lists after a short delay
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['orders'], type: 'active' });
      }, 100);
    },
  });
}
