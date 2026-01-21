'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { getOrderStatusColor, getOrderPriorityColor } from '@/lib/utils/orderUtils';
import type { Order, PriorityData } from '@/types';

interface OrderDialogTitleProps {
  order: Order | null;
  priority: PriorityData | null;
  loading: boolean;
  error: string;
  isEditing: boolean;
  onEdit: () => void;
  onDuplicate: (() => void) | null;
  onClose: () => void;
}

function OrderDialogTitle({ 
  order, 
  priority, 
  loading, 
  error, 
  isEditing, 
  onEdit, 
  onDuplicate, 
  onClose 
}: OrderDialogTitleProps) {
  if (loading) {
    return (
      <DialogTitle id="order-details-dialog-title">
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Loading...</Typography>
          <IconButton onClick={onClose} aria-label="Close dialog">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
    );
  }

  if (error && !order) {
    return (
      <DialogTitle id="order-details-dialog-title">
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Error</Typography>
          <IconButton onClick={onClose} aria-label="Close dialog">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <DialogTitle 
      id="order-details-dialog-title"
      sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 1,
        pb: 1,
      }}
    >
      <Box>
        <Typography variant="h6" component="span">
          Order {order.orderId}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
          {priority && (
            <Chip 
              label={priority.label} 
              color={getOrderPriorityColor(priority)} 
              size="small"
            />
          )}
          <Chip 
            label={order.status || 'Pending'} 
            color={getOrderStatusColor(order.status)} 
            size="small"
          />
        </Stack>
      </Box>
      <Box display="flex" alignItems="center" gap={1}>
        {!isEditing && (
          <>
            <Button 
              size="small" 
              startIcon={<EditIcon />}
              onClick={onEdit}
            >
              Edit
            </Button>
            {onDuplicate && (
              <Button 
                size="small"
                startIcon={<ContentCopyIcon />}
                onClick={onDuplicate}
              >
                Duplicate
              </Button>
            )}
          </>
        )}
        <IconButton onClick={onClose} aria-label="Close dialog">
          <CloseIcon />
        </IconButton>
      </Box>
    </DialogTitle>
  );
}

export default OrderDialogTitle;
