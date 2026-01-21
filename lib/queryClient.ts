import { QueryClient } from '@tanstack/react-query';

/**
 * Singleton QueryClient instance for the application
 * Centralized configuration ensures consistent caching behavior
 * Optimized for real-time UI updates with minimal caching
 * 
 * Configuration Strategy:
 * - Redis handles server-side caching with version control
 * - React Query focuses on client-side state management
 * - Mutations trigger immediate cache invalidation for real-time updates
 * - No aggressive client-side caching to ensure data freshness
 * 
 * For specific queries that can tolerate stale data, override with:
 * ```typescript
 * useQuery({
 *   queryKey: ['less-critical-data'],
 *   queryFn: fetchData,
 *   staleTime: 5 * 60_000, // 5 minutes for non-critical data
 * });
 * ```
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0, // Always consider data stale to enable refetching
      gcTime: 5 * 60_000, // Keep in cache for 5 minutes for navigation
      retry: 1,
      refetchOnWindowFocus: true, // Refetch on window focus for fresh data
      refetchOnReconnect: true,
      refetchOnMount: true, // Always refetch on component mount
    },
    mutations: {
      retry: 0,
    },
  },
});

/**
 * Clear all query cache
 * Useful when switching between guest mode and authenticated mode
 */
export function clearQueryCache(): void {
  queryClient.clear();
}

/**
 * Remove all queries from cache without cancelling ongoing fetches
 */
export function removeAllQueries(): void {
  queryClient.removeQueries();
}
