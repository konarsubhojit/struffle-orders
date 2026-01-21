'use client';

import { useState, useCallback, useEffect } from 'react';
import { getDeletedItems } from '@/lib/api/client';
import type { Item } from '@/types';

const DELETED_ITEMS_PER_PAGE = 20;

interface UseDeletedItemsResult {
  deletedItems: Item[];
  loadingDeleted: boolean;
  loadingMoreDeleted: boolean;
  hasMoreDeleted: boolean;
  deletedSearch: string;
  deletedSearchInput: string;
  setDeletedSearchInput: (value: string) => void;
  handleDeletedSearch: (e: React.FormEvent) => void;
  clearDeletedSearch: () => void;
  loadMoreDeleted: () => void;
  fetchDeletedItems: () => Promise<void>;
}

/**
 * Custom hook for managing deleted items data with page-based infinite scroll
 */
export const useDeletedItems = (showDeleted: boolean): UseDeletedItemsResult => {
  const [deletedItems, setDeletedItems] = useState<Item[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [hasMoreDeleted, setHasMoreDeleted] = useState<boolean>(false);
  const [deletedSearch, setDeletedSearch] = useState<string>('');
  const [deletedSearchInput, setDeletedSearchInput] = useState<string>('');
  const [loadingDeleted, setLoadingDeleted] = useState<boolean>(false);
  const [loadingMoreDeleted, setLoadingMoreDeleted] = useState<boolean>(false);

  const fetchDeletedItems = useCallback(async (page: number = 1, appendMode: boolean = false): Promise<void> => {
    if (appendMode) {
      setLoadingMoreDeleted(true);
    } else {
      setLoadingDeleted(true);
    }
    
    try {
      const result = await getDeletedItems({ 
        page,
        limit: DELETED_ITEMS_PER_PAGE,
      });
      
      if (!result.items || !Array.isArray(result.items)) {
        throw new Error('Invalid response format: items must be an array');
      }
      
      if (appendMode) {
        setDeletedItems(prev => [...prev, ...result.items]);
      } else {
        setDeletedItems(result.items);
      }
      
      setCurrentPage(result.pagination.page);
      setTotalPages(result.pagination.totalPages);
      setHasMoreDeleted(result.pagination.page < result.pagination.totalPages);
    } catch (err) {
      console.error('Failed to fetch deleted items:', err);
      if (!appendMode) {
        setDeletedItems([]);
      }
    } finally {
      setLoadingDeleted(false);
      setLoadingMoreDeleted(false);
    }
  }, []);

  useEffect(() => {
    if (showDeleted) {
      fetchDeletedItems(1, false);
    }
  }, [showDeleted, deletedSearch, fetchDeletedItems]);

  const loadMoreDeleted = useCallback((): void => {
    if (!loadingMoreDeleted && hasMoreDeleted) {
      fetchDeletedItems(currentPage + 1, true);
    }
  }, [loadingMoreDeleted, hasMoreDeleted, currentPage, fetchDeletedItems]);

  const handleDeletedSearch = (e: React.FormEvent): void => {
    e.preventDefault();
    setDeletedSearch(deletedSearchInput);
  };

  const clearDeletedSearch = (): void => {
    setDeletedSearchInput('');
    setDeletedSearch('');
  };

  const refetchDeletedItems = async (): Promise<void> => {
    await fetchDeletedItems(1, false);
  };

  return {
    deletedItems,
    loadingDeleted,
    loadingMoreDeleted,
    hasMoreDeleted,
    deletedSearch,
    deletedSearchInput,
    setDeletedSearchInput,
    handleDeletedSearch,
    clearDeletedSearch,
    loadMoreDeleted,
    fetchDeletedItems: refetchDeletedItems,
  };
};
