'use client';

import { useState, useEffect } from 'react';
import { getSalesAnalytics } from '@/lib/api/client';
import type { SalesAnalyticsResponse, RangeAnalytics, TimeRange } from '@/types';

interface UseSalesAnalyticsOptimizedResult {
  analytics: Record<string, RangeAnalytics>;
  getStatsForRange: (rangeKey: string) => RangeAnalytics;
  timeRanges: TimeRange[];
  loading: boolean;
  error: string | null;
  generatedAt: string | null;
}

const EMPTY_STATS: RangeAnalytics = {
  totalSales: 0,
  orderCount: 0,
  topItems: [],
  topItemsByRevenue: [],
  sourceBreakdown: {},
  topCustomersByOrders: [],
  topCustomersByRevenue: [],
  highestOrderingCustomer: null,
  averageOrderValue: 0,
  uniqueCustomers: 0
};

// Default time ranges - used when data is loading
const DEFAULT_TIME_RANGES: TimeRange[] = [
  { key: 'week', label: 'Last Week', days: 7 },
  { key: 'month', label: 'Last Month', days: 30 },
  { key: 'quarter', label: 'Last Quarter', days: 90 },
  { key: 'halfYear', label: 'Last 6 Months', days: 180 },
  { key: 'year', label: 'Last Year', days: 365 },
];

/**
 * Custom hook for fetching pre-computed sales analytics from backend
 * This replaces the client-side computation with backend-processed data
 */
export const useSalesAnalyticsOptimized = (
  statusFilter: 'completed' | 'all'
): UseSalesAnalyticsOptimizedResult => {
  const [analyticsData, setAnalyticsData] = useState<SalesAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await getSalesAnalytics(statusFilter);
        
        if (isMounted) {
          setAnalyticsData(data);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to fetch analytics';
          setError(errorMessage);
          setLoading(false);
          console.error('Error fetching sales analytics:', err);
        }
      }
    };

    fetchAnalytics();

    return () => {
      isMounted = false;
    };
  }, [statusFilter]);

  const getStatsForRange = (rangeKey: string): RangeAnalytics => {
    return analyticsData?.analytics[rangeKey] || EMPTY_STATS;
  };

  return {
    analytics: analyticsData?.analytics || {},
    getStatsForRange,
    timeRanges: analyticsData?.timeRanges || DEFAULT_TIME_RANGES,
    loading,
    error,
    generatedAt: analyticsData?.generatedAt || null,
  };
};
