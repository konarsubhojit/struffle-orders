import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('AnalyticsService');

interface TimeRange {
  key: string;
  label: string;
  days: number;
}

interface ItemCount {
  quantity: number;
  revenue: number;
}

interface ItemData {
  name: string;
  quantity: number;
  revenue: number;
}

interface CustomerData {
  customerId: string;
  customerName: string;
  orderCount: number;
  totalSpent: number;
  items: Record<string, number>;
}

interface SourceData {
  count: number;
  revenue: number;
}

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  items?: OrderItem[];
  customerId: string;
  customerName: string;
  totalPrice: number;
  orderFrom?: string;
  status?: string;
  orderDate?: Date | string;
  createdAt?: Date | string;
}

interface RangeAnalytics {
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

interface AnalyticsResponse {
  analytics: Record<string, RangeAnalytics>;
  timeRanges: TimeRange[];
  generatedAt: string;
}

// Time ranges configuration
const TIME_RANGES: TimeRange[] = [
  { key: 'week', label: 'Last Week', days: 7 },
  { key: 'month', label: 'Last Month', days: 30 },
  { key: 'quarter', label: 'Last Quarter', days: 90 },
  { key: 'halfYear', label: 'Last 6 Months', days: 180 },
  { key: 'year', label: 'Last Year', days: 365 },
];

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Aggregates item counts and revenue from filtered orders
 */
function aggregateItemCounts(filteredOrders: Order[]): Record<string, ItemCount> {
  const itemCounts: Record<string, ItemCount> = {};
  
  filteredOrders.forEach(order => {
    if (order.items && order.items.length > 0) {
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
}

/**
 * Aggregates customer order data including total spent and items purchased
 */
function aggregateCustomerData(filteredOrders: Order[]): Record<string, CustomerData> {
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
    if (order.items && order.items.length > 0) {
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
}

/**
 * Aggregates order count and revenue by source
 */
function aggregateSourceBreakdown(filteredOrders: Order[]): Record<string, SourceData> {
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
}

/**
 * Filter orders by time range
 */
function filterOrdersByTimeRange(orders: Order[], cutoffDate: Date): Order[] {
  return orders.filter(order => {
    const dateToUse = order.orderDate || order.createdAt;
    const orderDate = new Date(dateToUse as string | Date);
    return orderDate >= cutoffDate;
  });
}

/**
 * Filter orders by status
 */
function filterOrdersByStatus(orders: Order[], statusFilter: string): Order[] {
  if (statusFilter === 'all') {
    return orders;
  }
  
  return orders.filter(order => {
    const status = order.status;
    return status === 'completed' || status === null || status === undefined;
  });
}

/**
 * Calculate total sales and order count
 */
function calculateSalesTotals(orders: Order[]): { totalSales: number; orderCount: number; averageOrderValue: number } {
  const totalSales = orders.reduce((sum, order) => sum + order.totalPrice, 0);
  const orderCount = orders.length;
  const averageOrderValue = orderCount > 0 ? totalSales / orderCount : 0;
  
  return { totalSales, orderCount, averageOrderValue };
}

/**
 * Process item data to get top items by quantity and revenue
 */
function processItemData(itemCounts: Record<string, ItemCount>): { topItems: ItemData[]; topItemsByRevenue: ItemData[] } {
  const itemsArray: ItemData[] = Object.entries(itemCounts).map(([name, data]) => ({
    name,
    quantity: data.quantity,
    revenue: data.revenue
  }));

  const topItems = [...itemsArray].sort((a, b) => b.quantity - a.quantity).slice(0, 5);
  const topItemsByRevenue = [...itemsArray].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  
  return { topItems, topItemsByRevenue };
}

/**
 * Process customer data to get top customers
 */
function processCustomerData(customerCounts: Record<string, CustomerData>): {
  topCustomersByOrders: CustomerData[];
  topCustomersByRevenue: CustomerData[];
  highestOrderingCustomer: CustomerData | null;
  uniqueCustomers: number;
} {
  const customersArray = Object.values(customerCounts);
  
  const topCustomersByOrders = [...customersArray].sort((a, b) => b.orderCount - a.orderCount).slice(0, 5);
  const topCustomersByRevenue = [...customersArray].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);
  const highestOrderingCustomer = customersArray.length > 0 ? topCustomersByOrders[0] : null;
  
  return {
    topCustomersByOrders,
    topCustomersByRevenue,
    highestOrderingCustomer,
    uniqueCustomers: customersArray.length
  };
}

/**
 * Compute analytics for a specific time range and status filter
 */
function computeRangeAnalytics(orders: Order[], rangeDays: number, statusFilter: string, now: Date): RangeAnalytics {
  const cutoffDate = new Date(now.getTime() - rangeDays * MILLISECONDS_PER_DAY);
  
  const timeFilteredOrders = filterOrdersByTimeRange(orders, cutoffDate);
  const filteredOrders = filterOrdersByStatus(timeFilteredOrders, statusFilter);

  const { totalSales, orderCount, averageOrderValue } = calculateSalesTotals(filteredOrders);
  
  const itemCounts = aggregateItemCounts(filteredOrders);
  const { topItems, topItemsByRevenue } = processItemData(itemCounts);
  
  const sourceBreakdown = aggregateSourceBreakdown(filteredOrders);
  
  const customerCounts = aggregateCustomerData(filteredOrders);
  const { topCustomersByOrders, topCustomersByRevenue, highestOrderingCustomer, uniqueCustomers } = processCustomerData(customerCounts);

  return {
    totalSales,
    orderCount,
    topItems,
    topItemsByRevenue,
    sourceBreakdown,
    topCustomersByOrders,
    topCustomersByRevenue,
    highestOrderingCustomer,
    averageOrderValue,
    uniqueCustomers
  };
}

/**
 * Calculate sales analytics for all time ranges
 */
export function calculateSalesAnalytics(orders: Order[], statusFilter: string = 'completed'): AnalyticsResponse {
  const now = new Date();
  const analytics: Record<string, RangeAnalytics> = {};

  logger.info('Calculating sales analytics', { 
    totalOrders: orders.length, 
    statusFilter,
    timeRanges: TIME_RANGES.length 
  });

  TIME_RANGES.forEach(range => {
    analytics[range.key] = computeRangeAnalytics(orders, range.days, statusFilter, now);
  });

  logger.info('Sales analytics calculated', { 
    ranges: Object.keys(analytics).length,
    sampleRange: analytics.month ? {
      totalSales: analytics.month.totalSales,
      orderCount: analytics.month.orderCount
    } : null
  });

  return {
    analytics,
    timeRanges: TIME_RANGES,
    generatedAt: now.toISOString()
  };
}
