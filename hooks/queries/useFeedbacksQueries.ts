import { useQuery, type UseQueryResult, type UseQueryOptions } from '@tanstack/react-query';
import * as api from '@/lib/api/client';
import { queryKeys } from '@/lib/queryKeys';
import type { Feedback, FeedbackStats, FeedbackId, OrderId, PaginatedResult } from '@/types';

/**
 * Query hook for fetching all feedbacks
 * Returns the paginated result directly
 */
export function useFeedbacks(
  options?: Omit<UseQueryOptions<PaginatedResult<Feedback>, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<PaginatedResult<Feedback>, Error> {
  return useQuery({
    queryKey: queryKeys.feedbacks(),
    queryFn: () => api.getFeedbacks(),
    ...options,
  });
}

/**
 * Query hook for fetching paginated feedbacks
 */
export function useFeedbacksPaginated(
  page: number,
  limit: number,
  options?: Omit<UseQueryOptions<PaginatedResult<Feedback>, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<PaginatedResult<Feedback>, Error> {
  return useQuery({
    queryKey: queryKeys.feedbacksPaginated({ page, limit }),
    queryFn: () => api.getFeedbacksPaginated({ page, limit }),
    ...options,
  });
}

/**
 * Query hook for fetching a single feedback by ID (not available in API, removed)
 */
export function useFeedback(
  id: FeedbackId,
  options?: Omit<UseQueryOptions<Feedback | null, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<Feedback | null, Error> {
  return useQuery({
    queryKey: queryKeys.feedback(id),
    queryFn: async () => {
      // Get all feedbacks and find the one with matching ID
      const result = await api.getFeedbacks();
      return result.items.find(f => f.id === id) || null;
    },
    ...options,
  });
}

/**
 * Query hook for fetching feedbacks for a specific order
 */
export function useFeedbackByOrderId(
  orderId: OrderId,
  options?: Omit<UseQueryOptions<Feedback | null, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<Feedback | null, Error> {
  return useQuery({
    queryKey: queryKeys.feedbackByOrder(orderId),
    queryFn: () => api.getFeedbackByOrderId(orderId),
    ...options,
  });
}

/**
 * Query hook for fetching feedback statistics
 */
export function useFeedbackStats(
  options?: Omit<UseQueryOptions<FeedbackStats, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<FeedbackStats, Error> {
  return useQuery({
    queryKey: queryKeys.feedbackStats(),
    queryFn: () => api.getFeedbackStats(),
    ...options,
  });
}
