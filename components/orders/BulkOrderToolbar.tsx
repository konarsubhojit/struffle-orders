'use client';

import { useState, useCallback, type ReactElement, type MouseEvent } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import DeleteIcon from '@mui/icons-material/Delete';
import ClearIcon from '@mui/icons-material/Clear';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import CancelIcon from '@mui/icons-material/Cancel';
import PaymentIcon from '@mui/icons-material/Payment';
import MoneyOffIcon from '@mui/icons-material/MoneyOff';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { useNotification } from '@/contexts/NotificationContext';
import { useBulkUpdateOrders, useBulkDeleteOrders } from '@/hooks/queries/useBulkOrderQueries';
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  getOrderStatusLabel,
  getPaymentStatusLabel,
} from '@/constants/orderConstants';
import type { OrderId, OrderStatus, PaymentStatus } from '@/types';

interface BulkOrderToolbarProps {
  /** Array of selected order IDs */
  readonly selectedOrderIds: OrderId[];
  /** Callback to clear the selection */
  readonly onClearSelection: () => void;
  /** Optional callback called after successful bulk operation */
  readonly onSuccess?: () => void;
}

// Status icons for visual feedback
const statusIcons: Record<OrderStatus, ReactElement> = {
  pending: <PendingIcon fontSize="small" />,
  processing: <AutorenewIcon fontSize="small" />,
  completed: <DoneAllIcon fontSize="small" />,
  cancelled: <CancelIcon fontSize="small" />,
};

// Payment status icons
const paymentIcons: Record<PaymentStatus, ReactElement> = {
  unpaid: <MoneyOffIcon fontSize="small" />,
  partially_paid: <PaymentIcon fontSize="small" />,
  paid: <AttachMoneyIcon fontSize="small" />,
  cash_on_delivery: <PaymentIcon fontSize="small" />,
  refunded: <MoneyOffIcon fontSize="small" />,
};

/**
 * Toolbar component for bulk order operations.
 * Provides UI for updating status, payment status, and deleting multiple orders at once.
 */
export default function BulkOrderToolbar({
  selectedOrderIds,
  onClearSelection,
  onSuccess,
}: BulkOrderToolbarProps): ReactElement | null {
  const { showSuccess, showError } = useNotification();
  
  // Menu anchor states
  const [statusMenuAnchor, setStatusMenuAnchor] = useState<HTMLElement | null>(null);
  const [paymentMenuAnchor, setPaymentMenuAnchor] = useState<HTMLElement | null>(null);
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [permanentDelete, setPermanentDelete] = useState(false);
  
  // Mutation hooks
  const bulkUpdateMutation = useBulkUpdateOrders();
  const bulkDeleteMutation = useBulkDeleteOrders();
  
  const isLoading = bulkUpdateMutation.isPending || bulkDeleteMutation.isPending;
  const selectedCount = selectedOrderIds.length;
  
  // Status menu handlers - must be before conditional returns
  const handleStatusMenuOpen = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    setStatusMenuAnchor(event.currentTarget);
  }, []);
  
  const handleStatusMenuClose = useCallback(() => {
    setStatusMenuAnchor(null);
  }, []);
  
  // Payment menu handlers
  const handlePaymentMenuOpen = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    setPaymentMenuAnchor(event.currentTarget);
  }, []);
  
  const handlePaymentMenuClose = useCallback(() => {
    setPaymentMenuAnchor(null);
  }, []);
  
  // Handle status update
  const handleStatusUpdate = useCallback(async (status: OrderStatus) => {
    handleStatusMenuClose();
    
    try {
      const result = await bulkUpdateMutation.mutateAsync({
        orderIds: selectedOrderIds,
        updates: { status },
      });
      
      if (result.success) {
        showSuccess(
          `Successfully updated ${result.processedCount} order${result.processedCount === 1 ? '' : 's'} to "${getOrderStatusLabel(status)}"`,
          'Bulk Update Complete'
        );
        onSuccess?.();
        onClearSelection();
      } else if (result.errorCount > 0) {
        showError(
          `Updated ${result.processedCount} orders, but ${result.errorCount} failed`,
          'Partial Success'
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update orders';
      showError(message, 'Bulk Update Failed');
    }
  }, [selectedOrderIds, bulkUpdateMutation, showSuccess, showError, onSuccess, onClearSelection, handleStatusMenuClose]);
  
  // Handle payment status update
  const handlePaymentUpdate = useCallback(async (paymentStatus: PaymentStatus) => {
    handlePaymentMenuClose();
    
    try {
      const result = await bulkUpdateMutation.mutateAsync({
        orderIds: selectedOrderIds,
        updates: { paymentStatus },
      });
      
      if (result.success) {
        showSuccess(
          `Successfully updated payment status for ${result.processedCount} order${result.processedCount === 1 ? '' : 's'} to "${getPaymentStatusLabel(paymentStatus)}"`,
          'Bulk Update Complete'
        );
        onSuccess?.();
        onClearSelection();
      } else if (result.errorCount > 0) {
        showError(
          `Updated ${result.processedCount} orders, but ${result.errorCount} failed`,
          'Partial Success'
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update payment status';
      showError(message, 'Bulk Update Failed');
    }
  }, [selectedOrderIds, bulkUpdateMutation, showSuccess, showError, onSuccess, onClearSelection, handlePaymentMenuClose]);
  
  // Delete dialog handlers
  const handleDeleteDialogOpen = useCallback(() => {
    setDeleteDialogOpen(true);
    setPermanentDelete(false);
  }, []);
  
  const handleDeleteDialogClose = useCallback(() => {
    setDeleteDialogOpen(false);
    setPermanentDelete(false);
  }, []);
  
  // Handle bulk delete
  const handleBulkDelete = useCallback(async () => {
    try {
      const result = await bulkDeleteMutation.mutateAsync({
        orderIds: selectedOrderIds,
      });
      
      handleDeleteDialogClose();
      
      if (result.success) {
        showSuccess(
          `Successfully deleted ${result.processedCount} order${result.processedCount === 1 ? '' : 's'}`,
          'Bulk Delete Complete'
        );
        onSuccess?.();
        onClearSelection();
      } else if (result.errorCount > 0) {
        showError(
          `Deleted ${result.processedCount} orders, but ${result.errorCount} failed`,
          'Partial Success'
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete orders';
      showError(message, 'Bulk Delete Failed');
      handleDeleteDialogClose();
    }
  }, [selectedOrderIds, bulkDeleteMutation, showSuccess, showError, onSuccess, onClearSelection, handleDeleteDialogClose]);
  
  // Don't render if no orders are selected
  if (selectedCount === 0) {
    return null;
  }
  
  return (
    <>
      <Box
        component="section"
        aria-label="Bulk order operations"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          p: 2,
          backgroundColor: 'primary.main',
          color: 'primary.contrastText',
          borderRadius: 1,
          flexWrap: 'wrap',
        }}
      >
        {/* Selected count chip */}
        <Chip
          label={`${selectedCount} order${selectedCount === 1 ? '' : 's'} selected`}
          color="default"
          size="medium"
          icon={<CheckCircleIcon />}
          sx={{
            backgroundColor: 'primary.light',
            color: 'primary.contrastText',
            fontWeight: 600,
            '& .MuiChip-icon': {
              color: 'inherit',
            },
          }}
        />
        
        {/* Update Status dropdown */}
        <Button
          variant="contained"
          color="inherit"
          endIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <ArrowDropDownIcon />}
          onClick={handleStatusMenuOpen}
          disabled={isLoading}
          aria-haspopup="menu"
          aria-expanded={Boolean(statusMenuAnchor)}
          aria-controls={statusMenuAnchor ? 'status-menu' : undefined}
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
            },
          }}
        >
          Update Status
        </Button>
        <Menu
          id="status-menu"
          anchorEl={statusMenuAnchor}
          open={Boolean(statusMenuAnchor)}
          onClose={handleStatusMenuClose}
          slotProps={{
            list: {
              'aria-label': 'Order status options',
            },
          }}
        >
          {ORDER_STATUSES.map((status) => (
            <MenuItem
              key={status.value}
              onClick={() => handleStatusUpdate(status.value)}
            >
              <ListItemIcon>
                {statusIcons[status.value]}
              </ListItemIcon>
              <ListItemText>{status.label}</ListItemText>
            </MenuItem>
          ))}
        </Menu>
        
        {/* Update Payment dropdown */}
        <Button
          variant="contained"
          color="inherit"
          endIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <ArrowDropDownIcon />}
          onClick={handlePaymentMenuOpen}
          disabled={isLoading}
          aria-haspopup="menu"
          aria-expanded={Boolean(paymentMenuAnchor)}
          aria-controls={paymentMenuAnchor ? 'payment-menu' : undefined}
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
            },
          }}
        >
          Update Payment
        </Button>
        <Menu
          id="payment-menu"
          anchorEl={paymentMenuAnchor}
          open={Boolean(paymentMenuAnchor)}
          onClose={handlePaymentMenuClose}
          slotProps={{
            list: {
              'aria-label': 'Payment status options',
            },
          }}
        >
          {PAYMENT_STATUSES.map((status) => (
            <MenuItem
              key={status.value}
              onClick={() => handlePaymentUpdate(status.value)}
            >
              <ListItemIcon>
                {paymentIcons[status.value]}
              </ListItemIcon>
              <ListItemText>{status.label}</ListItemText>
            </MenuItem>
          ))}
        </Menu>
        
        {/* Delete button */}
        <Button
          variant="contained"
          color="error"
          startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
          onClick={handleDeleteDialogOpen}
          disabled={isLoading}
          sx={{
            ml: 'auto',
          }}
        >
          Delete
        </Button>
        
        {/* Clear selection button */}
        <Button
          variant="outlined"
          color="inherit"
          startIcon={<ClearIcon />}
          onClick={onClearSelection}
          disabled={isLoading}
          sx={{
            borderColor: 'rgba(255, 255, 255, 0.5)',
            '&:hover': {
              borderColor: 'rgba(255, 255, 255, 0.8)',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
        >
          Clear Selection
        </Button>
      </Box>
      
      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteDialogClose}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Delete {selectedCount} Order{selectedCount === 1 ? '' : 's'}?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete {selectedCount} selected order{selectedCount === 1 ? '' : 's'}? 
            This action will move the orders to the deleted items archive.
          </DialogContentText>
          <FormControlLabel
            control={
              <Checkbox
                checked={permanentDelete}
                onChange={(e) => setPermanentDelete(e.target.checked)}
                color="error"
              />
            }
            label="Permanently delete (cannot be undone)"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleDeleteDialogClose}
            disabled={bulkDeleteMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleBulkDelete}
            color="error"
            variant="contained"
            disabled={bulkDeleteMutation.isPending}
            startIcon={bulkDeleteMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
          >
            {bulkDeleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
