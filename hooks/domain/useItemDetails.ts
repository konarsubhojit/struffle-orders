'use client';

import { useState, useEffect, useCallback } from 'react';
import { getItems, updateItem } from '@/lib/api/client';
import type { Item, ItemId, UpdateItemData } from '@/types';

/**
 * Form state for editing an item
 */
export interface ItemEditForm {
  name: string;
  price: string;
  color: string;
  fabric: string;
  specialFeatures: string;
  removeImage: boolean;
}

/**
 * Creates initial edit form state from item data
 */
const createEditFormFromItem = (item: Item): ItemEditForm => ({
  name: item.name || '',
  price: String(item.price || 0),
  color: item.color || '',
  fabric: item.fabric || '',
  specialFeatures: item.specialFeatures || '',
  removeImage: false,
});

interface ValidationResult {
  valid: boolean;
  error?: string;
  parsedPrice?: number;
}

/**
 * Validates item form data
 */
const validateFormData = (editForm: ItemEditForm): ValidationResult => {
  if (!editForm.name.trim()) {
    return { valid: false, error: 'Item name is required' };
  }

  const parsedPrice = Number.parseFloat(editForm.price);
  if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
    return { valid: false, error: 'Price must be a valid non-negative number' };
  }

  return { valid: true, parsedPrice };
};

interface UseItemDetailsResult {
  item: Item | null;
  loading: boolean;
  saving: boolean;
  error: string;
  isEditing: boolean;
  editForm: ItemEditForm;
  imagePreview: string;
  setError: (error: string) => void;
  setImagePreview: (preview: string) => void;
  handleEditChange: (field: keyof ItemEditForm, value: string | number | boolean) => void;
  handleSave: (image?: string) => Promise<void>;
  handleCancelEdit: () => void;
  startEditing: () => void;
}

/**
 * Custom hook for managing item details, fetching, and editing
 */
export const useItemDetails = (
  itemId: ItemId,
  showSuccess: (message: string) => void,
  showError: (message: string) => void,
  onItemUpdated?: () => void
): UseItemDetailsResult => {
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [editForm, setEditForm] = useState<ItemEditForm>({
    name: '',
    price: '',
    color: '',
    fabric: '',
    specialFeatures: '',
    removeImage: false,
  });

  const fetchItem = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      // Fetch all items and find the specific one
      // This is consistent with how the app currently works
      const data = await getItems();
      const foundItem = data.items.find((i: Item) => i._id === itemId);
      
      if (!foundItem) {
        throw new Error('Item not found');
      }
      
      setItem(foundItem);
      setEditForm(createEditFormFromItem(foundItem));
      setImagePreview(foundItem.imageUrl || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch item details');
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    if (itemId) {
      fetchItem();
    }
  }, [itemId, fetchItem]);

  const handleEditChange = (field: keyof ItemEditForm, value: string | number | boolean): void => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (image?: string): Promise<void> => {
    if (!item) return;
    
    const validation = validateFormData(editForm);
    if (!validation.valid) {
      setError(validation.error ?? 'Validation failed');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const updateData: UpdateItemData = {
        name: editForm.name.trim(),
        price: validation.parsedPrice!, // Safe because validation.valid is true
        color: editForm.color.trim(),
        fabric: editForm.fabric.trim(),
        specialFeatures: editForm.specialFeatures.trim(),
      };

      // Handle image changes
      if (image) {
        updateData.image = image;
      } else if (editForm.removeImage) {
        updateData.image = null;
      }

      const updatedItem = await updateItem(itemId, updateData);
      
      // Update local state with new data
      setItem(updatedItem);
      setEditForm(createEditFormFromItem(updatedItem));
      setImagePreview(updatedItem.imageUrl || '');
      setIsEditing(false);
      
      if (onItemUpdated) onItemUpdated();
      showSuccess(`Item "${updatedItem.name}" updated successfully!`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update item';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = (): void => {
    setIsEditing(false);
    setError('');
    if (item) {
      setEditForm(createEditFormFromItem(item));
      setImagePreview(item.imageUrl || '');
    }
  };

  const startEditing = (): void => {
    setIsEditing(true);
  };

  return {
    item,
    loading,
    saving,
    error,
    isEditing,
    editForm,
    imagePreview,
    setError,
    setImagePreview,
    handleEditChange,
    handleSave,
    handleCancelEdit,
    startEditing,
  };
};
