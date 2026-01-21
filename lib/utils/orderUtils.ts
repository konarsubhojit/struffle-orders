import type { PriorityData } from '@/types';

type ChipColor = 'warning' | 'info' | 'success' | 'error' | 'default';

/**
 * Gets the color for order status chips
 */
export const getOrderStatusColor = (status: string): ChipColor => {
  switch (status) {
    case 'pending': return 'warning';
    case 'processing': return 'info';
    case 'completed': return 'success';
    case 'cancelled': return 'error';
    default: return 'default';
  }
};

/**
 * Gets the color for priority chips based on priority data
 * Matches the redesigned priority calculation logic:
 * 🔴 CRITICAL (overdue, critical): error
 * 🟠 URGENT: warning
 * 🔵 MEDIUM: info
 * 🟢 NORMAL: success
 */
export const getOrderPriorityColor = (priorityData: PriorityData | null | undefined): ChipColor => {
  if (!priorityData) return 'default';
  
  // Critical priority (overdue or ≤3 days)
  if (priorityData.className.includes('overdue') || 
      priorityData.className.includes('critical')) {
    return 'error';
  }
  
  // Urgent priority (4-7 days)
  if (priorityData.className.includes('urgent')) {
    return 'warning';
  }
  
  // Medium priority (8-14 days)
  if (priorityData.className.includes('medium')) {
    return 'info';
  }
  
  // Normal priority (>14 days)
  return 'success';
};

/**
 * Formats date for display in order details
 */
export const formatOrderDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Not set';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Formats delivery date for display
 */
export const formatOrderDeliveryDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Not set';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};
