'use client';

import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useOrderPagination } from '@/hooks';
import { useOrderFilters } from '@/hooks';
import { useInfiniteScroll } from '@/hooks';
import OrderDetailsPage from './OrderDetailsPage';
import OrderFiltersSection from '../common/OrderFiltersSection';
import OrderHistoryTableHeader from '../common/OrderHistoryTableHeader';
import OrderHistoryTableRow from '../common/OrderHistoryTableRow';
import OrderRowSkeleton from '../common/OrderRowSkeleton';
import type { OrderId, Order } from '@/types';

interface OrderHistoryProps {
  onDuplicateOrder: (orderId: string) => void;
  initialSelectedOrderId?: OrderId | null;
  onOrderDetailsClose?: () => void;
}

function OrderHistory({ onDuplicateOrder, initialSelectedOrderId = null, onOrderDetailsClose }: OrderHistoryProps) {
  const { formatPrice } = useCurrency();
  
  const {
    orders,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    fetchOrders,
  } = useOrderPagination();
  
  const loadMoreRef = useInfiniteScroll({
    onLoadMore: loadMore,
    loading: loadingMore,
    hasMore: hasMore,
  });
  
  const {
    filters,
    sortConfig,
    sortedOrders,
    handleFilterChange,
    handleClearFilters,
    handleSort,
  } = useOrderFilters(orders);
  
  const [selectedOrderId, setSelectedOrderId] = useState<OrderId | null>(initialSelectedOrderId);

  // Update selectedOrderId when initialSelectedOrderId changes (from priority panel)
  useEffect(() => {
    if (initialSelectedOrderId) {
      setSelectedOrderId(initialSelectedOrderId);
    }
  }, [initialSelectedOrderId]);

  const handleOrderClick = (orderId: OrderId) => {
    setSelectedOrderId(orderId);
  };

  const handleCloseDetails = () => {
    setSelectedOrderId(null);
    if (onOrderDetailsClose) {
      onOrderDetailsClose();
    }
  };

  if (loading) {
    return (
      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="h5" component="h2" gutterBottom fontWeight={600}>
          Order History
        </Typography>
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      </Paper>
    );
  }

  // Show order details page when an order is selected
  if (selectedOrderId) {
    return (
      <OrderDetailsPage
        orderId={selectedOrderId}
        onBack={handleCloseDetails}
        onOrderUpdated={() => fetchOrders()}
        onDuplicateOrder={onDuplicateOrder}
      />
    );
  }

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography variant="h5" component="h2" gutterBottom fontWeight={600}>
        Order History
      </Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
        <Typography variant="body2" fontWeight={600} color="text.secondary" gutterBottom>
          Priority Indicators (Based on 1-2 week standard production time):
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Chip label="🔴 Overdue" color="error" size="small" />
            <Typography variant="caption" color="text.secondary">Past due</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Chip label="🔴 Critical" color="error" size="small" variant="outlined" />
            <Typography variant="caption" color="text.secondary">≤3 days</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Chip label="🟠 Urgent" color="warning" size="small" />
            <Typography variant="caption" color="text.secondary">4-7 days</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Chip label="🔵 Medium" color="info" size="small" />
            <Typography variant="caption" color="text.secondary">8-14 days</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Chip label="🟢 Normal" color="success" size="small" />
            <Typography variant="caption" color="text.secondary">&gt;14 days</Typography>
          </Box>
        </Box>
      </Box>
      
      <OrderFiltersSection
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />

      {sortedOrders.length === 0 ? (
        <Typography color="text.secondary" textAlign="center" py={4}>
          No orders found
        </Typography>
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
            <Table size="small" aria-label="Orders table">
              <OrderHistoryTableHeader sortConfig={{ key: sortConfig.key, direction: sortConfig.direction }} onSort={(key) => handleSort(key as keyof Order)} />
              <TableBody>
                {sortedOrders.map(order => (
                  <OrderHistoryTableRow
                    key={order._id}
                    order={order}
                    formatPrice={formatPrice}
                    onClick={handleOrderClick}
                  />
                ))}
                
                {/* Loading skeletons while fetching more orders */}
                {loadingMore && Array.from({ length: 3 }).map((_, index) => (
                  <OrderRowSkeleton key={`skeleton-${index}`} />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          {/* Infinite scroll trigger element */}
          <div ref={loadMoreRef} style={{ height: '20px', margin: '20px 0' }} />
          
          {/* Show message when all orders are loaded */}
          {!hasMore && !loadingMore && orders.length > 0 && (
            <Typography color="text.secondary" textAlign="center" py={2}>
              All orders loaded ({orders.length} total)
            </Typography>
          )}
        </>
      )}
    </Paper>
  );
}

export default OrderHistory;
