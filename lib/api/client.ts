/**
 * API client for Next.js application
 * This module provides functions to interact with the backend API
 */

import type {
  Item,
  Order,
  Feedback,
  CreateItemData,
  UpdateItemData,
  CreateOrderData,
  UpdateOrderData,
  CreateFeedbackData,
  UpdateFeedbackData,
  PaginatedResult,
  PaginationParams,
  CursorPaginatedResult,
  CursorPaginationParams,
  FeedbackStats,
  TokenGenerationResponse,
  TokenValidationResponse,
  SalesAnalyticsResponse,
  SearchPaginationParams,
  ItemId,
  OrderId,
  FeedbackId,
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

/**
 * Generic fetch wrapper with error handling
 */
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('API request failed:', error);
    throw error;
  }
}

/**
 * Get authorization headers with bearer token
 * In Next.js, this could use server-side session or client-side token
 */
function getAuthHeaders(token?: string): Record<string, string> {
  if (token) {
    return { 'Authorization': `Bearer ${token}` };
  }
  return {};
}

// ==================== ITEMS API ====================

export async function getItems(
  params?: PaginationParams,
  token?: string
): Promise<PaginatedResult<Item>> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  
  const query = queryParams.toString();
  return fetchApi<PaginatedResult<Item>>(
    `/items${query ? `?${query}` : ''}`,
    { headers: getAuthHeaders(token) }
  );
}

export async function getDeletedItems(
  params?: PaginationParams,
  token?: string
): Promise<PaginatedResult<Item>> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  
  const query = queryParams.toString();
  return fetchApi<PaginatedResult<Item>>(
    `/items/deleted${query ? `?${query}` : ''}`,
    { headers: getAuthHeaders(token) }
  );
}

export async function createItem(
  data: CreateItemData,
  token?: string
): Promise<Item> {
  // For file uploads, use FormData
  if (data.image) {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('price', data.price.toString());
    if (data.color) formData.append('color', data.color);
    if (data.fabric) formData.append('fabric', data.fabric);
    if (data.specialFeatures) formData.append('specialFeatures', data.specialFeatures);
    if (data.image) formData.append('image', data.image);

    const response = await fetch(`${API_BASE_URL}/items`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  return fetchApi<Item>('/items', {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });
}

export async function updateItem(
  id: ItemId,
  data: UpdateItemData,
  token?: string
): Promise<Item> {
  return fetchApi<Item>(`/items/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });
}

export async function deleteItem(
  id: ItemId,
  token?: string
): Promise<void> {
  await fetchApi<void>(`/items/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  });
}

export async function restoreItem(
  id: ItemId,
  token?: string
): Promise<Item> {
  return fetchApi<Item>(`/items/${id}/restore`, {
    method: 'POST',
    headers: getAuthHeaders(token),
  });
}

export async function permanentlyDeleteItem(
  id: ItemId,
  token?: string
): Promise<void> {
  await fetchApi<void>(`/items/${id}/permanent`, {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  });
}

// ==================== ORDERS API ====================

export async function getOrders(
  params?: CursorPaginationParams,
  token?: string
): Promise<CursorPaginatedResult<Order>> {
  const queryParams = new URLSearchParams();
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.cursor) queryParams.append('cursor', params.cursor);
  
  const query = queryParams.toString();
  return fetchApi<CursorPaginatedResult<Order>>(
    `/orders${query ? `?${query}` : ''}`,
    { headers: getAuthHeaders(token) }
  );
}

export async function getOrder(
  id: OrderId,
  token?: string
): Promise<Order> {
  return fetchApi<Order>(`/orders/${id}`, {
    headers: getAuthHeaders(token),
  });
}

export async function createOrder(
  data: CreateOrderData,
  token?: string
): Promise<Order> {
  return fetchApi<Order>('/orders', {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });
}

export async function updateOrder(
  id: OrderId,
  data: UpdateOrderData,
  token?: string
): Promise<Order> {
  return fetchApi<Order>(`/orders/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });
}

export async function getPriorityOrders(
  token?: string
): Promise<Order[]> {
  return fetchApi<Order[]>('/orders/priority', {
    headers: getAuthHeaders(token),
  });
}

// ==================== FEEDBACKS API ====================

export async function getFeedbacks(
  params?: SearchPaginationParams,
  token?: string
): Promise<PaginatedResult<Feedback>> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.search) queryParams.append('search', params.search);
  
  const query = queryParams.toString();
  return fetchApi<PaginatedResult<Feedback>>(
    `/feedbacks${query ? `?${query}` : ''}`,
    { headers: getAuthHeaders(token) }
  );
}

export async function getFeedbacksPaginated(
  params?: PaginationParams,
  token?: string
): Promise<PaginatedResult<Feedback>> {
  return getFeedbacks(params, token);
}

export async function getFeedbackByOrderId(
  orderId: OrderId,
  token?: string
): Promise<Feedback | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/feedbacks/order/${orderId}`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(token),
      },
    });
    
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch order feedback');
    }
    
    return await response.json();
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('404')) {
      return null;
    }
    throw error;
  }
}

export async function createFeedback(
  data: CreateFeedbackData,
  token?: string
): Promise<Feedback> {
  return fetchApi<Feedback>('/feedbacks', {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });
}

export async function updateFeedback(
  id: FeedbackId,
  data: UpdateFeedbackData,
  token?: string
): Promise<Feedback> {
  return fetchApi<Feedback>(`/feedbacks/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });
}

export async function deleteFeedback(
  id: FeedbackId,
  token?: string
): Promise<void> {
  await fetchApi<void>(`/feedbacks/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  });
}

export async function getFeedbackStats(
  token?: string
): Promise<FeedbackStats> {
  return fetchApi<FeedbackStats>('/feedbacks/stats', {
    headers: getAuthHeaders(token),
  });
}

export async function generateFeedbackToken(
  orderId: OrderId,
  token?: string
): Promise<TokenGenerationResponse> {
  return fetchApi<TokenGenerationResponse>('/feedbacks/generate-token', {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ orderId }),
  });
}

export async function validateFeedbackToken(
  tokenStr: string
): Promise<TokenValidationResponse> {
  return fetchApi<TokenValidationResponse>(`/public/feedbacks/validate-token/${tokenStr}`);
}

export async function submitPublicFeedback(
  tokenStr: string,
  data: CreateFeedbackData
): Promise<Feedback> {
  return fetchApi<Feedback>(`/public/feedbacks/submit/${tokenStr}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getPublicFeedbacks(): Promise<Feedback[]> {
  return fetchApi<Feedback[]>('/public/feedbacks');
}

// ==================== ANALYTICS API ====================

export async function getSalesAnalytics(
  statusFilter: 'completed' | 'all' = 'completed'
): Promise<SalesAnalyticsResponse> {
  const queryParams = new URLSearchParams();
  queryParams.append('statusFilter', statusFilter);
  
  const query = queryParams.toString();
  return fetchApi<SalesAnalyticsResponse>(
    `/analytics/sales${query ? `?${query}` : ''}`,
    { headers: {} }
  );
}

// ==================== USER MANAGEMENT API (Admin only) ====================

export interface User {
  id: number;
  googleId: string;
  email: string;
  name: string;
  picture: string | null;
  role: 'admin' | 'user';
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserStats {
  totalUsers: number;
  adminUsers: number;
  regularUsers: number;
}

/**
 * Get all users (admin only)
 */
export async function getUsers(token?: string): Promise<User[]> {
  return fetchApi<User[]>('/users', {
    headers: getAuthHeaders(token),
  });
}

/**
 * Get user statistics (admin only)
 */
export async function getUserStats(token?: string): Promise<UserStats> {
  return fetchApi<UserStats>('/users/stats', {
    headers: getAuthHeaders(token),
  });
}

/**
 * Update user role (admin only)
 */
export async function updateUserRole(
  userId: number,
  role: 'admin' | 'user',
  token?: string
): Promise<User> {
  return fetchApi<User>(`/users/${userId}/role`, {
    method: 'PATCH',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ role }),
  });
}

// ==================== HEALTH CHECK ====================

export async function healthCheck(): Promise<{ status: string }> {
  return fetchApi<{ status: string }>('/health');
}
