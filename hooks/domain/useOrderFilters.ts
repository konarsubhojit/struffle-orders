'use client';

import { useState, useMemo } from 'react';
import type { Order, OrderSource, ConfirmationStatus, PaymentStatus } from '@/types';

interface OrderFilters {
  customerName: string;
  customerId: string;
  orderFrom: OrderSource | '';
  orderId: string;
  confirmationStatus: ConfirmationStatus | '';
  paymentStatus: PaymentStatus | '';
}

interface SortConfig {
  key: keyof Order;
  direction: 'asc' | 'desc';
}

/**
 * Creates an empty filter object with default values
 */
const createEmptyFilters = (): OrderFilters => ({
  customerName: '',
  customerId: '',
  orderFrom: '',
  orderId: '',
  confirmationStatus: '',
  paymentStatus: ''
});

/**
 * Checks if a text field matches a filter
 */
const matchesTextFilter = (value: string | undefined | null, filter: string): boolean => {
  return (value ?? '').toLowerCase().includes((filter ?? '').toLowerCase());
};

/**
 * Checks if an exact field matches a filter
 */
const matchesExactFilter = (value: string | undefined | null, filter: string): boolean => {
  return !filter || value === filter;
};

/**
 * Checks if an order matches the given filter criteria
 */
const orderMatchesFilters = (order: Order, filters: OrderFilters): boolean => {
  if (!filters) return true;
  
  return matchesTextFilter(order.customerName, filters.customerName) &&
         matchesTextFilter(order.customerId, filters.customerId) &&
         matchesTextFilter(order.orderId, filters.orderId) &&
         matchesExactFilter(order.orderFrom, filters.orderFrom) &&
         matchesExactFilter(order.confirmationStatus, filters.confirmationStatus) &&
         matchesExactFilter(order.paymentStatus, filters.paymentStatus);
};

interface NormalizedValues {
  a: number | string | Date;
  b: number | string | Date;
  earlyReturn?: number;
}

/**
 * Handles null value comparison for date sorting
 */
const handleNullDateComparison = (
  aValue: string | null | undefined, 
  bValue: string | null | undefined, 
  sortDirection: 'asc' | 'desc'
): number | null => {
  if (!aValue && !bValue) return 0;
  if (!aValue) return sortDirection === 'asc' ? 1 : -1;
  if (!bValue) return sortDirection === 'asc' ? -1 : 1;
  return null;
};

/**
 * Normalizes price values for comparison
 */
const normalizePriceValues = (
  aValue: number | string | undefined | null, 
  bValue: number | string | undefined | null, 
  sortDirection: 'asc' | 'desc'
): NormalizedValues => {
  const a = Number.parseFloat(String(aValue ?? 0));
  const b = Number.parseFloat(String(bValue ?? 0));
  
  if (Number.isNaN(a) && Number.isNaN(b)) return { a: 0, b: 0 };
  if (Number.isNaN(a)) return { a: 0, b: 0, earlyReturn: sortDirection === 'asc' ? 1 : -1 };
  if (Number.isNaN(b)) return { a: 0, b: 0, earlyReturn: sortDirection === 'asc' ? -1 : 1 };
  
  return { a, b };
};

/**
 * Normalizes date values for comparison
 */
const normalizeDateValues = (
  aValue: string | null | undefined, 
  bValue: string | null | undefined, 
  sortDirection: 'asc' | 'desc'
): NormalizedValues => {
  const nullResult = handleNullDateComparison(aValue, bValue, sortDirection);
  if (nullResult !== null) return { a: 0, b: 0, earlyReturn: nullResult };
  return { a: new Date(aValue!), b: new Date(bValue!) };
};

/**
 * Normalizes string values for comparison
 */
const normalizeStringValues = (
  aValue: unknown, 
  bValue: unknown
): NormalizedValues => {
  return { 
    a: String(aValue ?? '').toLowerCase(), 
    b: String(bValue ?? '').toLowerCase() 
  };
};

/**
 * Normalizes values based on sort key type
 */
const normalizeComparisonValues = (
  aValue: unknown, 
  bValue: unknown, 
  sortKey: keyof Order, 
  sortDirection: 'asc' | 'desc'
): NormalizedValues => {
  if (sortKey === 'totalPrice') {
    return normalizePriceValues(aValue as number, bValue as number, sortDirection);
  }
  
  if (sortKey === 'createdAt' || sortKey === 'expectedDeliveryDate') {
    return normalizeDateValues(aValue as string | null, bValue as string | null, sortDirection);
  }
  
  return normalizeStringValues(aValue, bValue);
};

/**
 * Compares two order values for sorting
 */
const compareOrderValues = (
  aValue: unknown, 
  bValue: unknown, 
  sortKey: keyof Order, 
  sortDirection: 'asc' | 'desc'
): number => {
  const normalized = normalizeComparisonValues(aValue, bValue, sortKey, sortDirection);
  if (normalized.earlyReturn !== undefined) return normalized.earlyReturn;

  const { a, b } = normalized;
  if (a < b) return sortDirection === 'asc' ? -1 : 1;
  if (a > b) return sortDirection === 'asc' ? 1 : -1;
  return 0;
};

interface UseOrderFiltersResult {
  filters: OrderFilters;
  sortConfig: SortConfig;
  filteredOrders: Order[];
  sortedOrders: Order[];
  handleFilterChange: (field: keyof OrderFilters, value: string) => void;
  handleClearFilters: () => void;
  handleSort: (key: keyof Order) => void;
}

/**
 * Custom hook for managing order filtering and sorting
 */
export const useOrderFilters = (orders: Order[]): UseOrderFiltersResult => {
  const [filters, setFilters] = useState<OrderFilters>(createEmptyFilters());
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'createdAt',
    direction: 'desc'
  });

  const handleFilterChange = (field: keyof OrderFilters, value: string): void => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleClearFilters = (): void => {
    setFilters(createEmptyFilters());
  };

  const handleSort = (key: keyof Order): void => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredOrders = useMemo((): Order[] => {
    // Defensive check: ensure orders is an array
    if (!orders || !Array.isArray(orders)) {
      return [];
    }
    return orders.filter(order => orderMatchesFilters(order, filters));
  }, [orders, filters]);

  const sortedOrders = useMemo((): Order[] => {
    const sorted = [...filteredOrders];
    sorted.sort((a, b) => compareOrderValues(
      a[sortConfig.key],
      b[sortConfig.key],
      sortConfig.key,
      sortConfig.direction
    ));
    return sorted;
  }, [filteredOrders, sortConfig]);

  return {
    filters,
    sortConfig,
    filteredOrders,
    sortedOrders,
    handleFilterChange,
    handleClearFilters,
    handleSort,
  };
};
