'use client';

import { useState, useEffect, useCallback, SyntheticEvent } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Rating,
  Chip,
  CircularProgress,
  Alert,
  Divider
} from '@mui/material';
import { getFeedbacksPaginated, getFeedbackStats } from '@/lib/api/client';
import PaginationControls from '../common/PaginationControls';
import { useNotification } from '@/contexts/NotificationContext';
import type { Feedback, FeedbackStats, PaginationInfo } from '@/types';

const ITEMS_PER_PAGE = 10;

const FeedbackPanel = () => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [paginationData, setPaginationData] = useState<PaginationInfo>({
    page: 1,
    limit: ITEMS_PER_PAGE,
    total: 0,
    totalPages: 1
  });
  const { showNotification } = useNotification();

  const fetchFeedbacks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getFeedbacksPaginated({ page: paginationData.page, limit: ITEMS_PER_PAGE });
      setFeedbacks(data.items || []);
      setPaginationData(data.pagination || {
        page: 1,
        limit: ITEMS_PER_PAGE,
        total: 0,
        totalPages: 1
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showNotification('Failed to fetch feedbacks: ' + errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [paginationData.page, showNotification]);

  const fetchStats = useCallback(async () => {
    try {
      const statsData = await getFeedbackStats();
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchFeedbacks();
    fetchStats();
  }, [fetchFeedbacks, fetchStats]);

  const getRatingLabel = (rating: number): string => {
    const labels: Record<number, string> = {
      1: 'Very Poor',
      2: 'Poor',
      3: 'Average',
      4: 'Good',
      5: 'Excellent'
    };
    return labels[rating] || '';
  };

  const getRatingColor = (rating: number): 'success' | 'warning' | 'error' => {
    if (rating >= 4) return 'success';
    if (rating >= 3) return 'warning';
    return 'error';
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handlePageChange = (newPage: number) => {
    setPaginationData(prev => ({ ...prev, page: newPage }));
  };

  const handleLimitChange = (newLimit: number) => {
    setPaginationData(prev => ({ ...prev, limit: newLimit, page: 1 }));
  };

  if (loading && feedbacks.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Customer Feedback
      </Typography>

      {/* Statistics Section */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Average Rating
                </Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <Rating value={parseFloat(stats.avgRating || '0') || 0} readOnly precision={0.1} />
                  <Typography variant="h6">
                    {stats.avgRating || 'N/A'}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Product Quality
                </Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <Rating value={parseFloat(stats.avgProductQuality || '0') || 0} readOnly precision={0.1} />
                  <Typography variant="h6">
                    {stats.avgProductQuality || 'N/A'}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Delivery Experience
                </Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <Rating value={parseFloat(stats.avgDeliveryExperience || '0') || 0} readOnly precision={0.1} />
                  <Typography variant="h6">
                    {stats.avgDeliveryExperience || 'N/A'}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Feedbacks
                </Typography>
                <Typography variant="h4">
                  {stats.totalFeedbacks || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Feedbacks List */}
      {feedbacks.length === 0 ? (
        <Alert severity="info">No feedbacks available yet.</Alert>
      ) : (
        <>
          <Grid container spacing={3}>
            {feedbacks.map((feedback) => (
              <Grid item xs={12} key={feedback._id}>
                <Paper elevation={2} sx={{ p: 3 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        Order #{feedback.orderId}
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Rating value={feedback.rating} readOnly />
                        <Chip 
                          label={getRatingLabel(feedback.rating)} 
                          color={getRatingColor(feedback.rating)}
                          size="small"
                        />
                      </Box>
                    </Box>
                    <Box textAlign="right">
                      <Typography variant="caption" color="textSecondary">
                        {formatDate(feedback.createdAt)}
                      </Typography>
                      {feedback.isPublic && (
                        <Chip label="Public" size="small" color="primary" sx={{ ml: 1 }} />
                      )}
                    </Box>
                  </Box>

                  {feedback.comment && (
                    <Box mb={2}>
                      <Typography variant="body1" paragraph>
                        {feedback.comment}
                      </Typography>
                    </Box>
                  )}

                  {/* Detailed Ratings */}
                  {(feedback.productQuality || feedback.deliveryExperience) && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Grid container spacing={2}>
                        {feedback.productQuality && (
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption" color="textSecondary">
                              Product Quality
                            </Typography>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Rating value={feedback.productQuality} readOnly size="small" />
                              <Typography variant="body2">{feedback.productQuality}/5</Typography>
                            </Box>
                          </Grid>
                        )}
                        {feedback.deliveryExperience && (
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption" color="textSecondary">
                              Delivery Experience
                            </Typography>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Rating value={feedback.deliveryExperience} readOnly size="small" />
                              <Typography variant="body2">{feedback.deliveryExperience}/5</Typography>
                            </Box>
                          </Grid>
                        )}
                      </Grid>
                    </>
                  )}

                  {/* Manager Response */}
                  {feedback.responseText && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Box bgcolor="grey.50" p={2} borderRadius={1}>
                        <Typography variant="subtitle2" color="primary" gutterBottom>
                          Manager Response
                        </Typography>
                        <Typography variant="body2" paragraph>
                          {feedback.responseText}
                        </Typography>
                        {feedback.respondedAt && (
                          <Typography variant="caption" color="textSecondary">
                            Responded on {formatDate(feedback.respondedAt)}
                          </Typography>
                        )}
                      </Box>
                    </>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* Pagination */}
          <Box sx={{ mt: 3 }}>
            <PaginationControls
              paginationData={paginationData}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
            />
          </Box>
        </>
      )}
    </Box>
  );
};

export default FeedbackPanel;
