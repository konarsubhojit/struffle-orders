'use client';

import { useState, useCallback, useEffect } from 'react';
import { getOrders } from '@/lib/api/client';
import type { Order } from '@/types';

const ORDERS_PER_PAGE = 10; // Fixed page size for infinite scroll

interface UseOrderPaginationResult {
  orders: Order[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string;
  loadMore: () => void;
  fetchOrders: () => Promise<void>;
}

/**
 * Custom hook for managing order data with cursor-based infinite scroll
 */
export const useOrderPagination = (): UseOrderPaginationResult => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);
  // Start with loading=true to prevent flash of "no orders" on initial load
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const fetchOrders = useCallback(async (cursor: string | null, appendMode: boolean): Promise<void> => {
    if (appendMode) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError('');
    
    try {
      const result = await getOrders({ cursor, limit: ORDERS_PER_PAGE });
      
      const ordersData = result.items || [];
      if (!Array.isArray(ordersData)) {
        throw new Error('Invalid response format: items must be an array');
      }
      
      if (appendMode) {
        setOrders(prev => [...prev, ...ordersData]);
      } else {
        setOrders(ordersData);
      }
      
      setNextCursor(result.pagination.nextCursor);
      setHasMore(result.pagination.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
      if (!appendMode) {
        setOrders([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchOrders(null, false);
  }, [fetchOrders]);

  const loadMore = useCallback((): void => {
    if (!loadingMore && hasMore && nextCursor) {
      fetchOrders(nextCursor, true);
    }
  }, [loadingMore, hasMore, nextCursor, fetchOrders]);

  const refetchOrders = async (): Promise<void> => {
    await fetchOrders(null, false);
  };

  return {
    orders,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    fetchOrders: refetchOrders,
  };
};
