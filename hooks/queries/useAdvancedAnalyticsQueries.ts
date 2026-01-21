'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys, type AnalyticsFiltersParams } from '@/lib/queryKeys';
import type { 
  ItemData, 
  CustomerData,
  ProfitSummary
} from '@/types';

// Re-export filter type for consumers
export type AnalyticsFilters = AnalyticsFiltersParams;

// Response types
export interface ProfitAnalyticsResponse {
  summary: ProfitSummary;
  byItem: Array<{
    itemId: number;
    itemName: string;
    revenue: number;
    cost: number;
    profit: number;
    margin: number;
  }>;
  trend: Array<{
    date: string;
    revenue: number;
    cost: number;
    profit: number;
  }>;
}

export interface SalesTrendsResponse {
  daily: Array<{
    date: string;
    orders: number;
    revenue: number;
    averageOrderValue: number;
  }>;
  bySource: Record<string, {
    orders: number;
    revenue: number;
    percentage: number;
  }>;
  comparison: {
    currentPeriod: { orders: number; revenue: number };
    previousPeriod: { orders: number; revenue: number };
    ordersChange: number;
    revenueChange: number;
  };
}

export interface TopItemsResponse {
  byQuantity: ItemData[];
  byRevenue: ItemData[];
  byProfit: Array<{
    itemId: number;
    name: string;
    quantity: number;
    revenue: number;
    profit: number;
  }>;
}

export interface TopCustomersResponse {
  byOrders: CustomerData[];
  byRevenue: CustomerData[];
  byFrequency: Array<{
    customerId: string;
    customerName: string;
    orderCount: number;
    averageOrderValue: number;
  }>;
}

// API client functions
async function fetchProfitAnalytics(filters: AnalyticsFilters): Promise<ProfitAnalyticsResponse> {
  const params = new URLSearchParams();
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  if (filters.timeRange) params.set('timeRange', filters.timeRange);
  
  const response = await fetch(`/api/analytics/profit?${params.toString()}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch profit analytics');
  }
  return response.json();
}

async function fetchSalesTrends(filters: AnalyticsFilters): Promise<SalesTrendsResponse> {
  const params = new URLSearchParams();
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  if (filters.timeRange) params.set('timeRange', filters.timeRange);
  
  const response = await fetch(`/api/analytics/trends?${params.toString()}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch sales trends');
  }
  return response.json();
}

async function fetchTopItems(filters: AnalyticsFilters): Promise<TopItemsResponse> {
  const params = new URLSearchParams();
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  if (filters.timeRange) params.set('timeRange', filters.timeRange);
  
  const response = await fetch(`/api/analytics/top-items?${params.toString()}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch top items');
  }
  return response.json();
}

async function fetchTopCustomers(filters: AnalyticsFilters): Promise<TopCustomersResponse> {
  const params = new URLSearchParams();
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  if (filters.timeRange) params.set('timeRange', filters.timeRange);
  
  const response = await fetch(`/api/analytics/top-customers?${params.toString()}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch top customers');
  }
  return response.json();
}

// Query hooks
export function useProfitAnalytics(filters: AnalyticsFilters = {}) {
  return useQuery({
    queryKey: queryKeys.analytics.profit(filters),
    queryFn: () => fetchProfitAnalytics(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes - analytics don't change frequently
  });
}

export function useSalesTrends(filters: AnalyticsFilters = {}) {
  return useQuery({
    queryKey: queryKeys.analytics.trends(filters),
    queryFn: () => fetchSalesTrends(filters),
    staleTime: 5 * 60 * 1000,
  });
}

export function useTopItems(filters: AnalyticsFilters = {}) {
  return useQuery({
    queryKey: queryKeys.analytics.topItems(filters),
    queryFn: () => fetchTopItems(filters),
    staleTime: 5 * 60 * 1000,
  });
}

export function useTopCustomers(filters: AnalyticsFilters = {}) {
  return useQuery({
    queryKey: queryKeys.analytics.topCustomers(filters),
    queryFn: () => fetchTopCustomers(filters),
    staleTime: 5 * 60 * 1000,
  });
}
