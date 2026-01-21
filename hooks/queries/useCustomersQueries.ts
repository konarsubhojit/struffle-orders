'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import type { 
  Customer, 
  CustomerSummary,
  CreateCustomerData, 
  UpdateCustomerData, 
  CustomerId,
  Order,
  PaginatedResult,
  CustomerSource
} from '@/types';

// Filter types
export interface CustomerFilters {
  page?: number;
  limit?: number;
  search?: string;
  source?: CustomerSource;
}

// API client functions
async function fetchCustomers(filters: CustomerFilters): Promise<PaginatedResult<Customer>> {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.search) params.set('search', filters.search);
  if (filters.source) params.set('source', filters.source);
  
  const response = await fetch(`/api/customers?${params.toString()}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch customers');
  }
  return response.json();
}

async function fetchCustomer(id: CustomerId): Promise<Customer> {
  const response = await fetch(`/api/customers/${id}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch customer');
  }
  return response.json();
}

async function searchCustomers(query: string): Promise<CustomerSummary[]> {
  const response = await fetch(`/api/customers/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to search customers');
  }
  return response.json();
}

async function fetchCustomerOrders(id: CustomerId): Promise<Order[]> {
  const response = await fetch(`/api/customers/${id}/orders`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch customer orders');
  }
  return response.json();
}

async function createCustomer(data: CreateCustomerData): Promise<Customer> {
  const response = await fetch('/api/customers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create customer');
  }
  return response.json();
}

async function updateCustomer({ 
  id, 
  data 
}: { 
  id: CustomerId; 
  data: UpdateCustomerData 
}): Promise<Customer> {
  const response = await fetch(`/api/customers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update customer');
  }
  return response.json();
}

async function deleteCustomer(id: CustomerId): Promise<void> {
  const response = await fetch(`/api/customers/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete customer');
  }
}

// Query hooks
export function useCustomers(filters: CustomerFilters = {}) {
  return useQuery({
    queryKey: queryKeys.customers.list(filters),
    queryFn: () => fetchCustomers(filters),
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}

export function useCustomer(id: CustomerId | null) {
  return useQuery({
    queryKey: queryKeys.customers.detail(id!),
    queryFn: () => fetchCustomer(id!),
    enabled: !!id,
    staleTime: 3 * 60 * 1000,
  });
}

export function useCustomerSearch(query: string) {
  return useQuery({
    queryKey: queryKeys.customers.search(query),
    queryFn: () => searchCustomers(query),
    enabled: query.length >= 2, // Only search with 2+ characters
    staleTime: 1 * 60 * 1000, // 1 minute for search results
  });
}

export function useCustomerOrders(id: CustomerId | null) {
  return useQuery({
    queryKey: queryKeys.customers.orders(id!),
    queryFn: () => fetchCustomerOrders(id!),
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Mutation hooks
export function useCreateCustomer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateCustomer,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(variables.id) });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
    },
  });
}
