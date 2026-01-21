'use client';

import { useMemo } from 'react';
import { DATE_RANGES, MILLISECONDS } from '@/constants/timeConstants';
import type { Order } from '@/types';

interface TimeRange {
  key: string;
  label: string;
  days: number;
}

export const TIME_RANGES: TimeRange[] = [
  { key: 'week', label: 'Last Week', days: DATE_RANGES.WEEK },
  { key: 'month', label: 'Last Month', days: DATE_RANGES.MONTH },
  { key: 'quarter', label: 'Last Quarter', days: DATE_RANGES.QUARTER },
  { key: 'halfYear', label: 'Last 6 Months', days: 180 },
  { key: 'year', label: 'Last Year', days: 365 },
];

export interface ItemData {
  name: string;
  quantity: number;
  revenue: number;
}

export interface CustomerData {
  customerId: string;
  customerName: string;
  orderCount: number;
  totalSpent: number;
  items: Record<string, number>;
}

export interface SourceData {
  count: number;
  revenue: number;
}

export interface RangeAnalytics {
  totalSales: number;
  orderCount: number;
  topItems: ItemData[];
  topItemsByRevenue: ItemData[];
  sourceBreakdown: Record<string, SourceData>;
  topCustomersByOrders: CustomerData[];
  topCustomersByRevenue: CustomerData[];
  highestOrderingCustomer: CustomerData | null;
  averageOrderValue: number;
  uniqueCustomers: number;
}

/**
 * Aggregates item counts and revenue from filtered orders
 */
const aggregateItemCounts = (filteredOrders: Order[]): Record<string, { quantity: number; revenue: number }> => {
  const itemCounts: Record<string, { quantity: number; revenue: number }> = {};
  
  filteredOrders.forEach(order => {
    if (order.items?.length) {
      order.items.forEach(item => {
        if (!itemCounts[item.name]) {
          itemCounts[item.name] = { quantity: 0, revenue: 0 };
        }
        itemCounts[item.name].quantity += item.quantity;
        itemCounts[item.name].revenue += item.price * item.quantity;
      });
    }
  });
  
  return itemCounts;
};

/**
 * Aggregates customer order data including total spent and items purchased
 */
const aggregateCustomerData = (filteredOrders: Order[]): Record<string, CustomerData> => {
  const customerCounts: Record<string, CustomerData> = {};
  
  filteredOrders.forEach(order => {
    const customerId = order.customerId;
    const customerName = order.customerName;
    const key = `${customerId}_${customerName}`;
    
    if (!customerCounts[key]) {
      customerCounts[key] = { 
        customerId, 
        customerName, 
        orderCount: 0, 
        totalSpent: 0,
        items: {}
      };
    }
    customerCounts[key].orderCount += 1;
    customerCounts[key].totalSpent += order.totalPrice;
    
    // Track items purchased by each customer
    if (order.items?.length) {
      order.items.forEach(item => {
        const itemName = item.name;
        if (!customerCounts[key].items[itemName]) {
          customerCounts[key].items[itemName] = 0;
        }
        customerCounts[key].items[itemName] += item.quantity;
      });
    }
  });
  
  return customerCounts;
};

/**
 * Aggregates order count and revenue by source
 */
const aggregateSourceBreakdown = (filteredOrders: Order[]): Record<string, SourceData> => {
  const sourceBreakdown: Record<string, SourceData> = {};
  
  filteredOrders.forEach(order => {
    const orderSource = order.orderFrom || 'unknown';
    if (!sourceBreakdown[orderSource]) {
      sourceBreakdown[orderSource] = { count: 0, revenue: 0 };
    }
    sourceBreakdown[orderSource].count += 1;
    sourceBreakdown[orderSource].revenue += order.totalPrice;
  });
  
  return sourceBreakdown;
};

interface UseSalesAnalyticsResult {
  analytics: Record<string, RangeAnalytics>;
  getStatsForRange: (rangeKey: string) => RangeAnalytics;
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

/**
 * Custom hook for calculating sales analytics from orders
 * Provides pre-computed analytics for each time range
 */
export const useSalesAnalytics = (
  orders: Order[],
  statusFilter: string
): UseSalesAnalyticsResult => {
  const analytics = useMemo((): Record<string, RangeAnalytics> => {
    const now = new Date();
    const results: Record<string, RangeAnalytics> = {};

    TIME_RANGES.forEach(range => {
      const cutoffDate = new Date(now.getTime() - range.days * MILLISECONDS.PER_DAY);
      
      const filteredOrders = orders.filter(order => {
        // Use orderDate if available, otherwise fall back to createdAt
        const dateToUse = order.orderDate || order.createdAt;
        const orderDate = new Date(dateToUse);
        const isInTimeRange = orderDate >= cutoffDate;
        
        // Apply status filter
        const matchesStatusFilter = statusFilter === 'all' || order.status === 'completed' || order.status === null || order.status === undefined;
        
        return isInTimeRange && matchesStatusFilter;
      });

      const totalSales = filteredOrders.reduce((sum, order) => sum + order.totalPrice, 0);
      const orderCount = filteredOrders.length;

      // Use helper functions to aggregate data
      const itemCounts = aggregateItemCounts(filteredOrders);
      const itemsArray: ItemData[] = Object.entries(itemCounts).map(([name, data]) => ({
        name,
        quantity: data.quantity,
        revenue: data.revenue
      }));

      itemsArray.sort((a, b) => b.quantity - a.quantity);
      const topItems = itemsArray.slice(0, 5);
      const topItemsByRevenue = [...itemsArray].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

      const sourceBreakdown = aggregateSourceBreakdown(filteredOrders);
      
      const customerCounts = aggregateCustomerData(filteredOrders);
      const customersArray = Object.values(customerCounts);
      customersArray.sort((a, b) => b.orderCount - a.orderCount);
      const topCustomersByOrders = customersArray.slice(0, 5);
      
      const topCustomersByRevenue = [...customersArray].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);
      const highestOrderingCustomer = customersArray.length > 0 ? customersArray[0] : null;

      results[range.key] = {
        totalSales,
        orderCount,
        topItems,
        topItemsByRevenue,
        sourceBreakdown,
        topCustomersByOrders,
        topCustomersByRevenue,
        highestOrderingCustomer,
        averageOrderValue: orderCount > 0 ? totalSales / orderCount : 0,
        uniqueCustomers: customersArray.length
      };
    });

    return results;
  }, [orders, statusFilter]);

  const getStatsForRange = (rangeKey: string): RangeAnalytics => {
    return analytics[rangeKey] || EMPTY_STATS;
  };

  return {
    analytics,
    getStatsForRange,
  };
};
