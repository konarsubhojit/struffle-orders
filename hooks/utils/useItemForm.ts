'use client';

import { useState } from 'react';
import type { Item, CreateItemData } from '@/types';

interface ValidationResult {
  valid: boolean;
  error?: string;
  priceNum?: number;
}

interface UseItemFormResult {
  name: string;
  price: string;
  color: string;
  fabric: string;
  specialFeatures: string;
  copiedFrom: string | null;
  error: string;
  setName: (name: string) => void;
  setPrice: (price: string) => void;
  setColor: (color: string) => void;
  setFabric: (fabric: string) => void;
  setSpecialFeatures: (features: string) => void;
  setCopiedFrom: (name: string | null) => void;
  setError: (error: string) => void;
  validateForm: () => ValidationResult;
  getFormData: (priceNum: number, image: string) => CreateItemData;
  resetForm: () => void;
  setFormFromItem: (item: Item) => void;
}

/**
 * Custom hook for managing item form state
 */
export const useItemForm = (): UseItemFormResult => {
  const [name, setName] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [color, setColor] = useState<string>('');
  const [fabric, setFabric] = useState<string>('');
  const [specialFeatures, setSpecialFeatures] = useState<string>('');
  const [copiedFrom, setCopiedFrom] = useState<string | null>(null);
  const [error, setError] = useState<string>('');

  const validateForm = (): ValidationResult => {
    if (!name.trim() || !price) {
      return { valid: false, error: 'Please fill in name and price' };
    }

    const priceNum = Number.parseFloat(price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      return { valid: false, error: 'Please enter a valid price' };
    }

    return { valid: true, priceNum };
  };

  const getFormData = (priceNum: number, image: string): CreateItemData => ({
    name: name.trim(),
    price: priceNum,
    color: color.trim(),
    fabric: fabric.trim(),
    specialFeatures: specialFeatures.trim(),
    image: image,
  });

  const resetForm = (): void => {
    setName('');
    setPrice('');
    setColor('');
    setFabric('');
    setSpecialFeatures('');
    setCopiedFrom(null);
    setError('');
  };

  const setFormFromItem = (item: Item): void => {
    setName(item.name);
    setPrice(String(item.price));
    setColor(item.color || '');
    setFabric(item.fabric || '');
    setSpecialFeatures(item.specialFeatures || '');
    setCopiedFrom(item.name);
    setError('');
  };

  return {
    name,
    price,
    color,
    fabric,
    specialFeatures,
    copiedFrom,
    error,
    setName,
    setPrice,
    setColor,
    setFabric,
    setSpecialFeatures,
    setCopiedFrom,
    setError,
    validateForm,
    getFormData,
    resetForm,
    setFormFromItem,
  };
};
