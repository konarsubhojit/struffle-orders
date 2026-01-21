'use client';

import { useState, useCallback, useEffect } from 'react';
import { getItems } from '@/lib/api/client';
import type { Item } from '@/types';

type AllowedLimit = 10 | 20 | 50;
const ITEMS_PER_PAGE = 10; // Fixed page size for infinite scroll

interface ItemsDataResult {
  items: Item[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string;
  search: string;
  searchInput: string;
  setSearchInput: (value: string) => void;
  handleSearch: (e: React.FormEvent) => void;
  clearSearch: () => void;
  loadMore: () => void;
  fetchItems: () => Promise<void>;
  setError: (error: string) => void;
}

/**
 * Custom hook for managing active items data with cursor-based infinite scroll
 */
export const useItemsData = (): ItemsDataResult => {
  const [items, setItems] = useState<Item[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const fetchItems = useCallback(async (page: number = 1, appendMode: boolean = false): Promise<void> => {
    if (appendMode) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError('');
    
    try {
      const result = await getItems({ 
        page,
        limit: ITEMS_PER_PAGE,
      });
      
      if (!result.items || !Array.isArray(result.items)) {
        throw new Error('Invalid response format: items must be an array');
      }
      
      if (appendMode) {
        setItems(prev => [...prev, ...result.items]);
      } else {
        setItems(result.items);
      }
      
      setCurrentPage(result.pagination.page);
      setTotalPages(result.pagination.totalPages);
      setHasMore(result.pagination.page < result.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch items');
      if (!appendMode) {
        setItems([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchItems(1, false);
  }, [search, fetchItems]);

  const loadMore = useCallback((): void => {
    if (!loadingMore && hasMore) {
      fetchItems(currentPage + 1, true);
    }
  }, [loadingMore, hasMore, currentPage, fetchItems]);

  const handleSearch = (e: React.FormEvent): void => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const clearSearch = (): void => {
    setSearchInput('');
    setSearch('');
  };

  const refetchItems = async (): Promise<void> => {
    await fetchItems(1, false);
  };

  return {
    items,
    loading,
    loadingMore,
    hasMore,
    error,
    search,
    searchInput,
    setSearchInput,
    handleSearch,
    clearSearch,
    loadMore,
    fetchItems: refetchItems,
    setError,
  };
};
