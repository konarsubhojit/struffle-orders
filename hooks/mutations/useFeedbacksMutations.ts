import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import * as api from '@/lib/api/client';
import { queryKeys } from '@/lib/queryKeys';
import type { Feedback, CreateFeedbackData, UpdateFeedbackData, TokenGenerationResponse, FeedbackId, OrderId } from '@/types';

/**
 * Mutation hook for creating feedback
 * Invalidates feedbacks, orders, and analytics caches on success
 */
export function useCreateFeedback(): UseMutationResult<Feedback, Error, CreateFeedbackData> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => api.createFeedback(data),
    onSuccess: (_data, variables) => {
      // Invalidate all feedbacks-related queries
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
      // Invalidate specific order's feedback using centralized query key factory
      if (variables.orderId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.feedbackByOrder(variables.orderId) });
      }
      // Orders may show feedback status
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

/**
 * Mutation hook for updating feedback
 * Invalidates feedbacks and analytics caches on success
 */
export function useUpdateFeedback(): UseMutationResult<Feedback, Error, { id: FeedbackId; data: UpdateFeedbackData }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => api.updateFeedback(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

/**
 * Mutation hook for generating a feedback token
 */
export function useGenerateFeedbackToken(): UseMutationResult<TokenGenerationResponse, Error, OrderId> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId) => api.generateFeedbackToken(orderId),
    onSuccess: () => {
      // Optionally invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
    },
  });
}

/**
 * Mutation hook for deleting feedback
 * Invalidates feedbacks and analytics caches on success
 */
export function useDeleteFeedback(): UseMutationResult<void, Error, FeedbackId> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => api.deleteFeedback(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}
