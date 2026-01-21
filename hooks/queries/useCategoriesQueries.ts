'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import type { Category, CreateCategoryData, UpdateCategoryData, CategoryId } from '@/types';

// API client functions
async function fetchCategories(): Promise<Category[]> {
  const response = await fetch('/api/categories');
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch categories');
  }
  return response.json();
}

async function fetchCategoriesTree(): Promise<Category[]> {
  const response = await fetch('/api/categories?tree=true');
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch categories tree');
  }
  return response.json();
}

async function fetchCategory(id: CategoryId): Promise<Category> {
  const response = await fetch(`/api/categories/${id}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch category');
  }
  return response.json();
}

async function createCategory(data: CreateCategoryData): Promise<Category> {
  const response = await fetch('/api/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create category');
  }
  return response.json();
}

async function updateCategory({ id, data }: { id: CategoryId; data: UpdateCategoryData }): Promise<Category> {
  const response = await fetch(`/api/categories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update category');
  }
  return response.json();
}

async function deleteCategory(id: CategoryId): Promise<void> {
  const response = await fetch(`/api/categories/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete category');
  }
}

// Query hooks
export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCategoriesTree() {
  return useQuery({
    queryKey: queryKeys.categories.tree,
    queryFn: fetchCategoriesTree,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCategory(id: CategoryId | null) {
  return useQuery({
    queryKey: queryKeys.categories.detail(id!),
    queryFn: () => fetchCategory(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// Mutation hooks
export function useCreateCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.tree });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateCategory,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.tree });
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.detail(variables.id) });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.tree });
    },
  });
}
