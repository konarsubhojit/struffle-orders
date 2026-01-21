import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import * as api from '@/lib/api/client';
import { queryKeys } from '@/lib/queryKeys';
import type { Item, CreateItemData, UpdateItemData, ItemId } from '@/types';

/**
 * Mutation hook for creating an item
 * Invalidates items and analytics caches on success
 */
export function useCreateItem(): UseMutationResult<Item, Error, CreateItemData> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => api.createItem(data),
    onSuccess: () => {
      // Invalidate all items-related queries
      queryClient.invalidateQueries({ queryKey: ['items'] });
      // Invalidate analytics since items affect sales data
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

/**
 * Mutation hook for updating an item
 * Uses returned data to update cache directly, then invalidates list queries
 */
export function useUpdateItem(): UseMutationResult<Item, Error, { id: ItemId; data: UpdateItemData }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => api.updateItem(id, data),
    onSuccess: (updatedItem, { id }) => {
      // Directly set the updated item data in cache to avoid refetch race condition
      queryClient.setQueryData(queryKeys.item(id), updatedItem);
      
      // Invalidate list queries so they refetch
      // But don't invalidate the single item query we just updated
      queryClient.invalidateQueries({ 
        queryKey: ['items'],
        refetchType: 'none', // Don't refetch immediately, just mark as stale
      });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      
      // Trigger background refetch for lists after a short delay
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['items'], type: 'active' });
      }, 100);
    },
  });
}

/**
 * Mutation hook for soft deleting an item
 * Invalidates items and analytics caches on success
 */
export function useDeleteItem(): UseMutationResult<void, Error, ItemId> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => api.deleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

/**
 * Mutation hook for restoring a soft-deleted item
 * Uses returned data to update cache directly, then invalidates list queries
 */
export function useRestoreItem(): UseMutationResult<Item, Error, ItemId> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => api.restoreItem(id),
    onSuccess: (restoredItem, id) => {
      // Directly set the restored item data in cache
      queryClient.setQueryData(queryKeys.item(id), restoredItem);
      
      // Invalidate list queries so they refetch
      // But don't invalidate the single item query we just updated
      queryClient.invalidateQueries({ 
        queryKey: ['items'],
        refetchType: 'none', // Don't refetch immediately, just mark as stale
      });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      
      // Trigger background refetch for lists after a short delay
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['items'], type: 'active' });
      }, 100);
    },
  });
}

/**
 * Mutation hook for permanently deleting an item
 * Invalidates items cache on success
 */
export function usePermanentlyDeleteItem(): UseMutationResult<void, Error, ItemId> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => api.permanentlyDeleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
}
