'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import type { 
  StockInfo, 
  StockTransaction, 
  StockTransactionType,
  ItemId,
  PaginatedResult
} from '@/types';

// Filter types
export interface StockFilters {
  page?: number;
  limit?: number;
  search?: string;
  lowStockOnly?: boolean;
}

export interface StockAdjustmentData {
  itemId: ItemId | number;
  quantity: number;
  transactionType: StockTransactionType;
  notes?: string;
}

export interface BulkStockAdjustmentData {
  adjustments: StockAdjustmentData[];
}

// API client functions
async function fetchItemStock(itemId: ItemId): Promise<StockInfo> {
  const response = await fetch(`/api/stock/${itemId}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch item stock');
  }
  return response.json();
}

async function fetchStockInventory(filters: StockFilters): Promise<PaginatedResult<StockInfo>> {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.search) params.set('search', filters.search);
  if (filters.lowStockOnly) params.set('lowStockOnly', 'true');
  
  const response = await fetch(`/api/stock?${params.toString()}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch stock inventory');
  }
  return response.json();
}

async function fetchLowStockItems(): Promise<StockInfo[]> {
  const response = await fetch('/api/stock/low');
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch low stock items');
  }
  return response.json();
}

async function fetchStockHistory(itemId: ItemId): Promise<StockTransaction[]> {
  const response = await fetch(`/api/stock/${itemId}/history`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch stock history');
  }
  return response.json();
}

async function adjustStock(data: StockAdjustmentData): Promise<StockTransaction> {
  const response = await fetch('/api/stock/adjust', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to adjust stock');
  }
  return response.json();
}

async function bulkAdjustStock(data: BulkStockAdjustmentData): Promise<StockTransaction[]> {
  const response = await fetch('/api/stock/adjust/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to bulk adjust stock');
  }
  return response.json();
}

// Query hooks
export function useItemStock(itemId: ItemId | null) {
  return useQuery({
    queryKey: queryKeys.stock.item(itemId!),
    queryFn: () => fetchItemStock(itemId!),
    enabled: !!itemId,
    staleTime: 1 * 60 * 1000, // 1 minute - stock changes frequently
  });
}

export function useStockInventory(filters: StockFilters = {}) {
  return useQuery({
    queryKey: queryKeys.stock.inventory(filters),
    queryFn: () => fetchStockInventory(filters),
    staleTime: 1 * 60 * 1000,
  });
}

export function useLowStockItems() {
  return useQuery({
    queryKey: queryKeys.stock.lowStock,
    queryFn: fetchLowStockItems,
    staleTime: 1 * 60 * 1000,
  });
}

export function useStockHistory(itemId: ItemId | null) {
  return useQuery({
    queryKey: queryKeys.stock.history(itemId!),
    queryFn: () => fetchStockHistory(itemId!),
    enabled: !!itemId,
    staleTime: 1 * 60 * 1000,
  });
}

// Mutation hooks
export function useAdjustStock() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: adjustStock,
    onSuccess: (_, variables) => {
      // Invalidate specific item stock
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.stock.item(variables.itemId as ItemId) 
      });
      // Invalidate inventory and low stock
      queryClient.invalidateQueries({ queryKey: queryKeys.stock.all });
      // Invalidate items queries as stock changed
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
}

export function useBulkAdjustStock() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: bulkAdjustStock,
    onSuccess: () => {
      // Invalidate all stock-related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.stock.all });
      // Invalidate items queries as stock changed
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
}
