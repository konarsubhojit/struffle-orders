'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import type { 
  OrderNote, 
  CreateOrderNoteData, 
  OrderNoteId, 
  OrderId 
} from '@/types';

// API client functions
async function fetchOrderNotes(orderId: OrderId): Promise<OrderNote[]> {
  const response = await fetch(`/api/orders/${orderId}/notes`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch order notes');
  }
  return response.json();
}

async function createOrderNote(data: CreateOrderNoteData): Promise<OrderNote> {
  const response = await fetch(`/api/orders/${data.orderId}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create order note');
  }
  return response.json();
}

async function updateOrderNote({ 
  orderId, 
  noteId, 
  data 
}: { 
  orderId: OrderId; 
  noteId: OrderNoteId; 
  data: Partial<CreateOrderNoteData> 
}): Promise<OrderNote> {
  const response = await fetch(`/api/orders/${orderId}/notes/${noteId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update order note');
  }
  return response.json();
}

async function deleteOrderNote({ 
  orderId, 
  noteId 
}: { 
  orderId: OrderId; 
  noteId: OrderNoteId 
}): Promise<void> {
  const response = await fetch(`/api/orders/${orderId}/notes/${noteId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete order note');
  }
}

async function pinOrderNote({ 
  orderId, 
  noteId, 
  isPinned 
}: { 
  orderId: OrderId; 
  noteId: OrderNoteId; 
  isPinned: boolean 
}): Promise<OrderNote> {
  const response = await fetch(`/api/orders/${orderId}/notes/${noteId}/pin`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isPinned }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to toggle pin on order note');
  }
  return response.json();
}

// Query hooks
export function useOrderNotes(orderId: OrderId | null) {
  return useQuery({
    queryKey: queryKeys.orderNotes.byOrder(orderId!),
    queryFn: () => fetchOrderNotes(orderId!),
    enabled: !!orderId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Mutation hooks
export function useCreateOrderNote() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createOrderNote,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.orderNotes.byOrder(variables.orderId as OrderId) 
      });
    },
  });
}

export function useUpdateOrderNote() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateOrderNote,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.orderNotes.byOrder(variables.orderId) 
      });
    },
  });
}

export function useDeleteOrderNote() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteOrderNote,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.orderNotes.byOrder(variables.orderId) 
      });
    },
  });
}

export function usePinOrderNote() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: pinOrderNote,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.orderNotes.byOrder(variables.orderId) 
      });
    },
  });
}
