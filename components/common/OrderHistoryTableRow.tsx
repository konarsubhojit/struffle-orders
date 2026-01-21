'use client';

import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { getPriorityStatus } from '@/lib/utils/priorityUtils';
import { getOrderPriorityColor } from '@/lib/utils/orderUtils';
import {
  getPaymentStatusLabel,
  getConfirmationStatusLabel,
  getDeliveryStatusLabel,
} from '@/constants/orderConstants';
import type { Order, OrderId, OrderStatus, PaymentStatus, DeliveryStatus } from '@/types';

interface OrderHistoryTableRowProps {
  order: Order;
  formatPrice: (price: number) => string;
  onClick: (orderId: OrderId) => void;
}

/**
 * Formats delivery date for order history display
 */
const formatHistoryDeliveryDate = (dateString: string | null): string => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

/**
 * Gets color for order status in history
 */
const getHistoryStatusColor = (status: OrderStatus | undefined): 'warning' | 'info' | 'success' | 'error' | 'default' => {
  switch (status) {
    case 'pending': return 'warning';
    case 'processing': return 'info';
    case 'completed': return 'success';
    case 'cancelled': return 'error';
    default: return 'default';
  }
};

/**
 * Gets color for payment status
 */
const getHistoryPaymentColor = (status: PaymentStatus | undefined): 'success' | 'warning' | 'default' => {
  switch (status) {
    case 'paid': return 'success';
    case 'partially_paid': return 'warning';
    case 'unpaid': return 'default';
    default: return 'default';
  }
};

/**
 * Gets color for delivery status
 */
const getHistoryDeliveryColor = (status: DeliveryStatus | undefined): 'success' | 'info' | 'primary' | 'error' | 'default' => {
  switch (status) {
    case 'delivered': return 'success';
    case 'out_for_delivery': return 'info';
    case 'in_transit': return 'info';
    case 'shipped': return 'primary';
    case 'returned': return 'error';
    case 'not_shipped': return 'default';
    default: return 'default';
  }
};

function OrderHistoryTableRow({ order, formatPrice, onClick }: OrderHistoryTableRowProps) {
  const priority = getPriorityStatus(order.expectedDeliveryDate, { shortLabels: true, orderStatus: order.status });
  
  return (
    <TableRow 
      onClick={() => onClick(order._id)}
      hover
      sx={{ cursor: 'pointer' }}
    >
      <TableCell>
        <Typography variant="body2" fontWeight={600} color="primary">
          {order.orderId}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2">{order.customerName}</Typography>
        <Typography variant="caption" color="text.secondary">{order.customerId}</Typography>
      </TableCell>
      <TableCell>
        <Chip label={order.orderFrom} size="small" color="primary" variant="outlined" />
      </TableCell>
      <TableCell>
        <Chip 
          label={getConfirmationStatusLabel(order.confirmationStatus)} 
          size="small" 
          variant="outlined"
        />
      </TableCell>
      <TableCell>
        <Chip 
          label={order.status || 'pending'} 
          size="small" 
          color={getHistoryStatusColor(order.status)}
        />
      </TableCell>
      <TableCell>
        <Chip 
          label={getPaymentStatusLabel(order.paymentStatus)} 
          size="small" 
          color={getHistoryPaymentColor(order.paymentStatus)}
        />
      </TableCell>
      <TableCell>
        <Chip 
          label={getDeliveryStatusLabel(order.deliveryStatus)} 
          size="small" 
          color={getHistoryDeliveryColor(order.deliveryStatus)}
        />
      </TableCell>
      <TableCell align="right">
        <Typography variant="body2" fontWeight={500}>
          {formatPrice(order.totalPrice)}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2">
          {formatHistoryDeliveryDate(order.expectedDeliveryDate)}
        </Typography>
        {priority && (
          <Chip 
            label={priority.label} 
            size="small" 
            color={getOrderPriorityColor(priority)}
            sx={{ mt: 0.5 }}
          />
        )}
      </TableCell>
    </TableRow>
  );
}

export default OrderHistoryTableRow;
