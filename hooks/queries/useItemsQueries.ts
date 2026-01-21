import { useQuery, type UseQueryResult, type UseQueryOptions } from '@tanstack/react-query';
import * as api from '@/lib/api/client';
import { queryKeys } from '@/lib/queryKeys';
import type { Item, PaginatedResult } from '@/types';

/**
 * Query hook for fetching all items
 * Returns paginated result
 */
export function useItems(
  options?: Omit<UseQueryOptions<PaginatedResult<Item>, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<PaginatedResult<Item>, Error> {
  return useQuery({
    queryKey: queryKeys.items(),
    queryFn: () => api.getItems(),
    ...options,
  });
}

/**
 * Query hook for fetching paginated items
 */
export function useItemsPaginated(
  page: number,
  limit: number,
  options?: Omit<UseQueryOptions<PaginatedResult<Item>, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<PaginatedResult<Item>, Error> {
  return useQuery({
    queryKey: queryKeys.itemsCursor({ limit, cursor: String(page) }),
    queryFn: () => api.getItems({ page, limit }),
    ...options,
  });
}

/**
 * Query hook for fetching deleted items with cursor-based pagination
 */
export function useDeletedItemsQuery(
  limit: number = 50,
  cursor?: string | null,
  search?: string,
  options?: Omit<UseQueryOptions<PaginatedResult<Item>, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<PaginatedResult<Item>, Error> {
  const page = cursor ? parseInt(cursor, 10) : 1;
  return useQuery({
    queryKey: queryKeys.deletedItems({ limit, cursor, search }),
    queryFn: () => api.getDeletedItems({ page, limit }),
    ...options,
  });
}
