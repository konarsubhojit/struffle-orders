'use client';

import { useState, useEffect, useCallback } from 'react';
import { getPriorityOrders } from '@/lib/api/client';
import type { Order, OrderStatus } from '@/types';
import { MILLISECONDS, POLLING_INTERVALS } from '@/constants/timeConstants';

type UrgencyLevel = 'critical' | 'high' | 'medium' | 'normal';

export interface OrderWithPriority extends Order {
  effectivePriority: number;
  urgency: UrgencyLevel;
}

/**
 * Calculate how many days until/since delivery date
 */
export function getDaysUntilDelivery(deliveryDate: string | null): number | null {
  if (!deliveryDate) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const delivery = new Date(deliveryDate);
  delivery.setHours(0, 0, 0, 0);
  
  const diffDays = Math.ceil((delivery.getTime() - today.getTime()) / MILLISECONDS.PER_DAY);
  return diffDays;
}

/**
 * Calculate effective priority score for sorting
 * Higher score = more urgent
 */
export function calculateEffectivePriority(order: Order): number {
  let score = order.priority || 0;
  
  if (order.expectedDeliveryDate) {
    const diffDays = getDaysUntilDelivery(order.expectedDeliveryDate);
    if (diffDays !== null) {
      // Overdue orders get highest priority
      if (diffDays < 0) {
        score += 100 + Math.abs(diffDays); // More overdue = higher score
      }
      // Due today
      else if (diffDays === 0) {
        score += 50;
      }
      // Due within 3 days
      else if (diffDays <= 3) {
        score += 30 - (diffDays * 5); // Closer = higher score
      }
    }
  }
  
  return score;
}

/**
 * Get urgency level for visual styling in the dashboard
 */
export function getUrgencyLevel(order: Order): UrgencyLevel {
  if (!order.expectedDeliveryDate) {
    if (order.priority >= 8) return 'critical';
    if (order.priority >= 5) return 'high';
    return 'normal';
  }
  
  const diffDays = getDaysUntilDelivery(order.expectedDeliveryDate);
  if (diffDays === null) return 'normal';
  
  // Overdue or ≤3 days = critical
  if (diffDays < 0 || diffDays <= 3) return 'critical';
  // 4-7 days = high
  if (diffDays <= 7) return 'high';
  // 8-14 days = medium
  if (diffDays <= 14) return 'medium';
  // >14 days = normal
  return 'normal';
}

/**
 * Get notification message for an order
 */
export function getNotificationMessage(order: Order): string {
  const days = getDaysUntilDelivery(order.expectedDeliveryDate);
  
  if (days !== null) {
    if (days < 0) {
      return `Overdue by ${Math.abs(days)} day${Math.abs(days) > 1 ? 's' : ''}`;
    }
    if (days === 0) {
      return 'Due today!';
    }
    if (days <= 3) {
      return `Due in ${days} day${days > 1 ? 's' : ''}`;
    }
  }
  
  if (order.priority >= 8) {
    return 'Critical priority';
  }
  if (order.priority >= 5) {
    return 'High priority';
  }
  
  return 'Needs attention';
}

interface UsePriorityOrdersResult {
  orders: OrderWithPriority[];
  criticalOrders: OrderWithPriority[];
  highPriorityOrders: OrderWithPriority[];
  mediumPriorityOrders: OrderWithPriority[];
  loading: boolean;
  error: string;
  fetchPriorityOrders: () => Promise<void>;
  criticalCount: number;
}

interface UsePriorityOrdersOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

/**
 * Custom hook for managing priority orders
 * Fetches orders from API and calculates urgency/priority
 */
export const usePriorityOrders = (options: UsePriorityOrdersOptions = {}): UsePriorityOrdersResult => {
  const { autoRefresh = false, refreshInterval = POLLING_INTERVALS.PRIORITY_ORDERS } = options;
  
  const [orders, setOrders] = useState<OrderWithPriority[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPriorityOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Use backend /api/orders/priority endpoint - more efficient (DB filtering)
      const data = await getPriorityOrders();
      
      // Ensure data is an array
      const ordersArray = Array.isArray(data) ? data : [];
      
      // Calculate effective priority and sort
      const ordersWithPriority: OrderWithPriority[] = ordersArray.map(order => ({
        ...order,
        effectivePriority: calculateEffectivePriority(order),
        urgency: getUrgencyLevel(order)
      }));
      
      ordersWithPriority.sort((a, b) => b.effectivePriority - a.effectivePriority);
      
      setOrders(ordersWithPriority);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPriorityOrders();
    
    if (autoRefresh) {
      const interval = setInterval(fetchPriorityOrders, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchPriorityOrders, autoRefresh, refreshInterval]);

  const criticalOrders = orders.filter(o => o.urgency === 'critical');
  const highPriorityOrders = orders.filter(o => o.urgency === 'high');
  const mediumPriorityOrders = orders.filter(o => o.urgency === 'medium');
  
  const criticalCount = orders.filter(order => {
    const days = getDaysUntilDelivery(order.expectedDeliveryDate);
    return (days !== null && days < 0) || order.priority >= 8;
  }).length;

  return {
    orders,
    criticalOrders,
    highPriorityOrders,
    mediumPriorityOrders,
    loading,
    error,
    fetchPriorityOrders,
    criticalCount,
  };
};
