'use client';

import { useState, useEffect, useCallback, SyntheticEvent } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Rating,
  Grid,
  FormControlLabel,
  Checkbox,
  CircularProgress
} from '@mui/material';
import { createFeedback, getFeedbackByOrderId } from '@/lib/api/client';
import { useNotification } from '@/contexts/NotificationContext';
import type { Order } from '@/types';

interface FeedbackFormData {
  rating: number | null;
  comment: string;
  productQuality: number | null;
  deliveryExperience: number | null;
  isPublic: boolean;
}

interface FeedbackDialogProps {
  open: boolean;
  onClose: () => void;
  order: Order | null;
  onFeedbackSubmitted?: () => void;
}

const FeedbackDialog = ({ open, onClose, order, onFeedbackSubmitted }: FeedbackDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [hasExistingFeedback, setHasExistingFeedback] = useState(false);
  const [formData, setFormData] = useState<FeedbackFormData>({
    rating: 0,
    comment: '',
    productQuality: 0,
    deliveryExperience: 0,
    isPublic: true
  });
  const { showNotification } = useNotification();

  const checkExistingFeedback = useCallback(async () => {
    if (!order) return;
    try {
      const feedback = await getFeedbackByOrderId(order._id);
      setHasExistingFeedback(!!feedback);
    } catch {
      setHasExistingFeedback(false);
    }
  }, [order]);

  useEffect(() => {
    if (open && order) {
      checkExistingFeedback();
    }
  }, [open, order, checkExistingFeedback]);

  const handleChange = <K extends keyof FeedbackFormData>(field: K, value: FeedbackFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!order) return;
    
    if (formData.rating === 0 || formData.rating === null) {
      showNotification('Please provide an overall rating', 'warning');
      return;
    }

    try {
      setLoading(true);
      await createFeedback({
        orderId: order._id,
        rating: formData.rating,
        comment: formData.comment || undefined,
        productQuality: formData.productQuality || undefined,
        deliveryExperience: formData.deliveryExperience || undefined,
        isPublic: formData.isPublic
      });
      showNotification('Feedback submitted successfully!', 'success');
      if (onFeedbackSubmitted) onFeedbackSubmitted();
      handleClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showNotification('Failed to submit feedback: ' + errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      rating: 0,
      comment: '',
      productQuality: 0,
      deliveryExperience: 0,
      isPublic: true
    });
    setHasExistingFeedback(false);
    onClose();
  };

  const handleRatingChange = (_event: SyntheticEvent, newValue: number | null) => {
    handleChange('rating', newValue);
  };

  const handleProductQualityChange = (_event: SyntheticEvent, newValue: number | null) => {
    handleChange('productQuality', newValue);
  };

  const handleDeliveryExperienceChange = (_event: SyntheticEvent, newValue: number | null) => {
    handleChange('deliveryExperience', newValue);
  };

  if (!order) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Submit Feedback for Order #{order.orderId}
      </DialogTitle>
      <DialogContent>
        {hasExistingFeedback ? (
          <Box py={3}>
            <Typography variant="body1" color="textSecondary" textAlign="center">
              Feedback has already been submitted for this order.
            </Typography>
          </Box>
        ) : order.status !== 'completed' ? (
          <Box py={3}>
            <Typography variant="body1" color="textSecondary" textAlign="center">
              Feedback can only be submitted for completed orders.
            </Typography>
          </Box>
        ) : (
          <Box component="form" onSubmit={handleSubmit}>
            {/* Overall Rating */}
            <Box mb={3}>
              <Typography component="legend" gutterBottom>
                Overall Rating <Typography component="span" color="error">*</Typography>
              </Typography>
              <Rating
                value={formData.rating}
                onChange={handleRatingChange}
                size="large"
              />
            </Box>

            {/* Detailed Ratings */}
            <Grid container spacing={2} mb={3}>
              <Grid item xs={12} sm={6}>
                <Typography component="legend" variant="body2" gutterBottom>
                  Product Quality
                </Typography>
                <Rating
                  value={formData.productQuality}
                  onChange={handleProductQualityChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography component="legend" variant="body2" gutterBottom>
                  Delivery Experience
                </Typography>
                <Rating
                  value={formData.deliveryExperience}
                  onChange={handleDeliveryExperienceChange}
                />
              </Grid>
            </Grid>

            {/* Comment */}
            <TextField
              fullWidth
              label="Your Feedback"
              multiline
              rows={4}
              value={formData.comment}
              onChange={(e) => handleChange('comment', e.target.value)}
              placeholder="Tell us about your experience..."
              inputProps={{ maxLength: 1000 }}
              helperText={`${formData.comment.length}/1000 characters`}
              sx={{ mb: 2 }}
            />

            {/* Public Checkbox */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.isPublic}
                  onChange={(e) => handleChange('isPublic', e.target.checked)}
                />
              }
              label="Make this feedback public (visible to other customers)"
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        {!hasExistingFeedback && order.status === 'completed' && (
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || formData.rating === 0 || formData.rating === null}
            startIcon={loading && <CircularProgress size={20} />}
          >
            Submit Feedback
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default FeedbackDialog;
