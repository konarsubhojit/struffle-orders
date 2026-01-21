'use client';

import { FormEvent } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import DialogContent from '@mui/material/DialogContent';
import CustomerInfoSection from './CustomerInfoSection';
import OrderInfoSection from './OrderInfoSection';
import PaymentInfoSection from './PaymentInfoSection';
import OrderItemsTable from './OrderItemsTable';
import type { Order, OrderEditForm, PriorityData } from '@/types';

interface OrderDialogContentProps {
  order: Order | null;
  loading: boolean;
  error: string;
  isEditing: boolean;
  editForm: OrderEditForm;
  formatPrice: (price: number) => string;
  priority: PriorityData | null;
  onEditChange: (field: string, value: string | number) => void;
}

function OrderDialogContent({ 
  order, 
  loading, 
  error, 
  isEditing, 
  editForm, 
  formatPrice, 
  priority,
  onEditChange 
}: OrderDialogContentProps) {
  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
  };

  if (loading) {
    return (
      <DialogContent dividers>
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      </DialogContent>
    );
  }

  if (error && !order) {
    return (
      <DialogContent dividers>
        <Alert severity="error">{error}</Alert>
      </DialogContent>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <DialogContent dividers>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {isEditing ? (
        <Box component="form" id="order-edit-form" onSubmit={handleFormSubmit}>
          <Stack spacing={3}>
            <CustomerInfoSection
              isEditing={true}
              data={editForm}
              onDataChange={onEditChange}
            />

            <OrderInfoSection
              isEditing={true}
              data={editForm}
              onDataChange={onEditChange}
            />

            <PaymentInfoSection
              isEditing={true}
              data={{ ...editForm, totalPrice: order.totalPrice }}
              formatPrice={formatPrice}
              onDataChange={onEditChange}
            />

            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Customer Notes
              </Typography>
              <TextField
                value={editForm.customerNotes}
                onChange={(e) => onEditChange('customerNotes', e.target.value)}
                placeholder="Enter any notes about this customer or order"
                fullWidth
                multiline
                rows={2}
              />
            </Box>
          </Stack>
        </Box>
      ) : (
        <Stack spacing={3}>
          <CustomerInfoSection
            isEditing={false}
            data={order}
          />

          <Divider />

          <OrderInfoSection
            isEditing={false}
            data={order}
            priority={priority}
          />

          <Divider />

          <PaymentInfoSection
            isEditing={false}
            data={order}
            formatPrice={formatPrice}
          />

          {order.customerNotes && (
            <>
              <Divider />
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Customer Notes
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="body2">{order.customerNotes}</Typography>
                </Paper>
              </Box>
            </>
          )}

          <Divider />

          <OrderItemsTable
            items={order.items}
            formatPrice={formatPrice}
          />
        </Stack>
      )}
    </DialogContent>
  );
}

export default OrderDialogContent;
