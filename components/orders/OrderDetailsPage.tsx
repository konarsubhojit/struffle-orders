'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SaveIcon from '@mui/icons-material/Save';
import LinkIcon from '@mui/icons-material/Link';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useNotification } from '@/contexts/NotificationContext';
import { useOrderDetails } from '@/hooks';
import { getPriorityStatus } from '@/lib/utils/priorityUtils';
import { getOrderPriorityColor } from '@/lib/utils/orderUtils';
import CustomerInfoSection from '../common/CustomerInfoSection';
import OrderInfoSection from '../common/OrderInfoSection';
import PaymentInfoSection from '../common/PaymentInfoSection';
import OrderItemsTable from '../common/OrderItemsTable';
import { generateFeedbackToken } from '@/lib/api/client';
import type { OrderId, OrderEditForm } from '@/types';

interface OrderDetailsPageProps {
  orderId: OrderId;
  onBack: () => void;
  onOrderUpdated: () => void;
  onDuplicateOrder?: (orderId: string) => void;
}

function OrderDetailsPage({ orderId, onBack, onOrderUpdated, onDuplicateOrder }: OrderDetailsPageProps) {
  const { formatPrice } = useCurrency();
  const { showSuccess, showError } = useNotification();
  const [generatingToken, setGeneratingToken] = useState(false);
  
  const {
    order,
    loading,
    saving,
    error,
    isEditing,
    editForm,
    handleEditChange,
    handleSave,
    handleCancelEdit,
    startEditing,
  } = useOrderDetails(orderId, showSuccess, showError, onOrderUpdated);

  const priority = order ? getPriorityStatus(order.expectedDeliveryDate, { orderStatus: order.status }) : null;

  const handleDuplicate = () => {
    if (onDuplicateOrder) {
      onDuplicateOrder(String(orderId));
    }
    onBack();
  };

  const handleGenerateFeedbackLink = async () => {
    if (!order) return;
    
    try {
      setGeneratingToken(true);
      const tokenData = await generateFeedbackToken(order._id);
      
      const feedbackAppUrl = process.env.NEXT_PUBLIC_FEEDBACK_APP_URL || 'http://localhost:3001';
      const feedbackLink = `${feedbackAppUrl}/?token=${tokenData.token}`;
      
      navigator.clipboard.writeText(feedbackLink).then(() => {
        showSuccess('Secure feedback link copied to clipboard! Valid for 30 days.');
      }).catch(() => {
        showSuccess(`Feedback link: ${feedbackLink}`);
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      showError('Failed to generate feedback link: ' + errorMessage);
    } finally {
      setGeneratingToken(false);
    }
  };

  if (loading) {
    return (
      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <IconButton onClick={onBack} aria-label="Go back">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" component="h2" fontWeight={600}>
            Order Details
          </Typography>
        </Box>
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      </Paper>
    );
  }

  if (error && !order) {
    return (
      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <IconButton onClick={onBack} aria-label="Go back">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" component="h2" fontWeight={600}>
            Order Details
          </Typography>
        </Box>
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2} mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={onBack} aria-label="Go back">
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="h5" component="h2" fontWeight={600}>
                {order.orderId}
              </Typography>
              {priority && (
                <Chip 
                  label={priority.label} 
                  size="small" 
                  color={getOrderPriorityColor(priority)}
                />
              )}
            </Box>
            <Typography variant="body2" color="text.secondary">
              {order.customerName}
            </Typography>
          </Box>
        </Box>
        
        <Box display="flex" gap={1} flexWrap="wrap">
          {!isEditing && (
            <>
              {onDuplicateOrder && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ContentCopyIcon />}
                  onClick={handleDuplicate}
                >
                  Duplicate
                </Button>
              )}
              <Button
                variant="outlined"
                size="small"
                startIcon={<EditIcon />}
                onClick={startEditing}
              >
                Edit
              </Button>
            </>
          )}
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Content */}
      {isEditing ? (
        <Box component="form" id="order-edit-form" onSubmit={(e) => e.preventDefault()}>
          <Stack spacing={3}>
            <CustomerInfoSection
              isEditing={true}
              data={editForm}
              onDataChange={(field: string, value: string | number) => handleEditChange(field as keyof OrderEditForm, value)}
            />

            <OrderInfoSection
              isEditing={true}
              data={editForm}
              onDataChange={(field: string, value: string | number) => handleEditChange(field as keyof OrderEditForm, value)}
            />

            <PaymentInfoSection
              isEditing={true}
              data={{ ...editForm, totalPrice: order.totalPrice }}
              formatPrice={formatPrice}
              onDataChange={(field: string, value: string | number) => handleEditChange(field as keyof OrderEditForm, value)}
            />

            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Customer Notes
              </Typography>
              <TextField
                value={editForm.customerNotes}
                onChange={(e) => handleEditChange('customerNotes', e.target.value)}
                placeholder="Enter any notes about this customer or order"
                fullWidth
                multiline
                rows={2}
              />
            </Box>
          </Stack>

          {/* Edit Actions */}
          <Box display="flex" justifyContent="flex-end" gap={2} mt={3}>
            <Button onClick={handleCancelEdit} color="inherit">
              Cancel
            </Button>
            <Button 
              variant="contained"
              onClick={handleSave}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
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

          {/* Actions */}
          {order.status === 'completed' && (
            <Box display="flex" justifyContent="flex-start" mt={2}>
              <Button 
                onClick={handleGenerateFeedbackLink}
                startIcon={generatingToken ? <CircularProgress size={16} /> : <LinkIcon />}
                color="primary"
                variant="outlined"
                disabled={generatingToken}
              >
                {generatingToken ? 'Generating...' : 'Get Feedback Link'}
              </Button>
            </Box>
          )}
        </Stack>
      )}
    </Paper>
  );
}

export default OrderDetailsPage;
