'use client';

import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import SaveIcon from '@mui/icons-material/Save';
import LinkIcon from '@mui/icons-material/Link';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useNotification } from '@/contexts/NotificationContext';
import { useOrderDetails } from '@/hooks';
import { getPriorityStatus } from '@/lib/utils/priorityUtils';
import OrderDialogTitle from '../common/OrderDialogTitle';
import OrderDialogContent from '../common/OrderDialogContent';
import { generateFeedbackToken } from '@/lib/api/client';
import type { OrderId } from '@/types';

interface OrderDetailsProps {
  orderId: OrderId;
  onClose: () => void;
  onOrderUpdated: () => void;
  onDuplicateOrder?: (orderId: string) => void;
}

function OrderDetails({ orderId, onClose, onOrderUpdated, onDuplicateOrder }: OrderDetailsProps) {
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
    onClose();
  };

  const handleGenerateFeedbackLink = async () => {
    if (!order) return;
    
    try {
      setGeneratingToken(true);
      // Generate secure token via API
      const tokenData = await generateFeedbackToken(order._id);
      
      // Generate feedback link with token
      const feedbackAppUrl = process.env.NEXT_PUBLIC_FEEDBACK_APP_URL || 'http://localhost:3001';
      const feedbackLink = `${feedbackAppUrl}/?token=${tokenData.token}`;
      
      // Copy to clipboard
      navigator.clipboard.writeText(feedbackLink).then(() => {
        showSuccess('Secure feedback link copied to clipboard! Valid for 30 days.');
      }).catch(() => {
        // Fallback: show the link
        showSuccess(`Feedback link: ${feedbackLink}`);
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      showError('Failed to generate feedback link: ' + errorMessage);
    } finally {
      setGeneratingToken(false);
    }
  };

  return (
    <>
      <Dialog 
        open={true} 
        onClose={onClose}
        maxWidth="md"
        fullWidth
        aria-labelledby="order-details-dialog-title"
      >
        <OrderDialogTitle
          order={order}
          priority={priority}
          loading={loading}
          error={error}
          isEditing={isEditing}
          onEdit={startEditing}
          onDuplicate={onDuplicateOrder ? handleDuplicate : null}
          onClose={onClose}
        />

        <OrderDialogContent
          order={order}
          loading={loading}
          error={error}
          isEditing={isEditing}
          editForm={editForm}
          formatPrice={formatPrice}
          priority={priority}
          onEditChange={(field, value) => handleEditChange(field as keyof typeof editForm, value)}
        />

        <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
          <Box>
            {order && order.status === 'completed' && !isEditing && (
              <Button 
                onClick={handleGenerateFeedbackLink}
                startIcon={generatingToken ? <CircularProgress size={16} /> : <LinkIcon />}
                color="primary"
                variant="outlined"
                disabled={generatingToken}
              >
                {generatingToken ? 'Generating...' : 'Get Feedback Link'}
              </Button>
            )}
          </Box>
          <Box>
            {order && isEditing && (
              <>
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
              </>
            )}
          </Box>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default OrderDetails;
