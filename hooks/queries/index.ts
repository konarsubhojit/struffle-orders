// Items queries
export { useItems, useItemsPaginated, useDeletedItemsQuery } from './useItemsQueries';

// Orders queries
export { useOrdersAll, useOrdersPaginated, useOrder, usePriorityOrdersQuery } from './useOrdersQueries';

// Feedbacks queries
export {
  useFeedbacks,
  useFeedbacksPaginated,
  useFeedback,
  useFeedbackByOrderId,
  useFeedbackStats,
} from './useFeedbacksQueries';

// Analytics queries
export { useSalesAnalyticsQuery } from './useAnalyticsQueries';

// Advanced Analytics queries
export {
  useProfitAnalytics,
  useSalesTrends,
  useTopItems,
  useTopCustomers,
  type AnalyticsFilters,
  type ProfitAnalyticsResponse,
  type SalesTrendsResponse,
  type TopItemsResponse,
  type TopCustomersResponse,
} from './useAdvancedAnalyticsQueries';

// Categories queries
export {
  useCategories,
  useCategoriesTree,
  useCategory,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from './useCategoriesQueries';

// Tags queries
export {
  useTags,
  useTag,
  useCreateTag,
  useUpdateTag,
  useDeleteTag,
} from './useTagsQueries';

// Audit logs queries
export {
  useAuditLogs,
  useRecentActivity,
  useOrderAuditTrail,
} from './useAuditLogsQueries';

// Order Notes queries
export {
  useOrderNotes,
  useCreateOrderNote,
  useUpdateOrderNote,
  useDeleteOrderNote,
  usePinOrderNote,
} from './useOrderNotesQueries';

// Customers queries
export {
  useCustomers,
  useCustomer,
  useCustomerSearch,
  useCustomerOrders,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  type CustomerFilters,
} from './useCustomersQueries';

// Stock queries
export {
  useItemStock,
  useStockInventory,
  useLowStockItems,
  useStockHistory,
  useAdjustStock,
  useBulkAdjustStock,
  type StockFilters,
  type StockAdjustmentData,
  type BulkStockAdjustmentData,
} from './useStockQueries';

// Bulk Order queries
export {
  useBulkUpdateOrders,
  useBulkDeleteOrders,
  type BulkUpdateOrdersData,
  type BulkDeleteOrdersData,
  type BulkOperationResult,
} from './useBulkOrderQueries';

