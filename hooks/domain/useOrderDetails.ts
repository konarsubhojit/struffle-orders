'use client';

import { useState, useEffect, useCallback } from 'react';
import { getOrder, updateOrder } from '@/lib/api/client';
import type { Order, OrderId, OrderEditForm, UpdateOrderData, OrderSource, OrderStatus, PaymentStatus, ConfirmationStatus, DeliveryStatus } from '@/types';

/**
 * Creates initial edit form state from order data
 */
const createEditFormFromOrder = (data: Order): OrderEditForm => ({
  customerName: data.customerName || '',
  customerId: data.customerId || '',
  address: data.address || '',
  orderFrom: data.orderFrom || '',
  orderDate: data.orderDate ? data.orderDate.split('T')[0] : '',
  expectedDeliveryDate: data.expectedDeliveryDate ? data.expectedDeliveryDate.split('T')[0] : '',
  status: data.status || 'pending',
  paymentStatus: data.paymentStatus || 'unpaid',
  paidAmount: data.paidAmount || 0,
  confirmationStatus: data.confirmationStatus || 'unconfirmed',
  customerNotes: data.customerNotes || '',
  priority: data.priority || 0,
  deliveryStatus: data.deliveryStatus || 'not_shipped',
  trackingId: data.trackingId || '',
  deliveryPartner: data.deliveryPartner || '',
  actualDeliveryDate: data.actualDeliveryDate ? data.actualDeliveryDate.split('T')[0] : ''
});

interface ValidationResult {
  valid: boolean;
  error?: string;
  parsedPaidAmount?: number;
}

/**
 * Validates order form data
 */
const validateFormData = (editForm: OrderEditForm, totalPrice: number): ValidationResult => {
  if (!editForm.customerName.trim() || !editForm.customerId.trim()) {
    return { valid: false, error: 'Customer name and ID are required' };
  }

  const parsedPaidAmount = Number.parseFloat(String(editForm.paidAmount));
  if (Number.isNaN(parsedPaidAmount) || parsedPaidAmount < 0) {
    return { valid: false, error: 'Paid amount must be a valid non-negative number' };
  }

  if (parsedPaidAmount > totalPrice) {
    return { valid: false, error: 'Paid amount cannot exceed total price' };
  }

  if (
    editForm.paymentStatus === 'partially_paid' &&
    (parsedPaidAmount <= 0 || parsedPaidAmount >= totalPrice)
  ) {
    return { valid: false, error: 'For partially paid orders, paid amount must be greater than 0 and less than total price' };
  }

  return { valid: true, parsedPaidAmount };
};

interface UseOrderDetailsResult {
  order: Order | null;
  loading: boolean;
  saving: boolean;
  error: string;
  isEditing: boolean;
  editForm: OrderEditForm;
  setError: (error: string) => void;
  handleEditChange: (field: keyof OrderEditForm, value: string | number) => void;
  handleSave: () => Promise<void>;
  handleCancelEdit: () => void;
  startEditing: () => void;
}

/**
 * Custom hook for managing order details, fetching, and editing
 */
export const useOrderDetails = (
  orderId: string | number,
  showSuccess: (message: string) => void,
  showError: (message: string) => void,
  onOrderUpdated?: () => void
): UseOrderDetailsResult => {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<OrderEditForm>({
    customerName: '',
    customerId: '',
    address: '',
    orderFrom: '',
    orderDate: '',
    expectedDeliveryDate: '',
    status: '',
    paymentStatus: '',
    paidAmount: '',
    confirmationStatus: '',
    customerNotes: '',
    priority: 0,
    deliveryStatus: 'not_shipped',
    trackingId: '',
    deliveryPartner: '',
    actualDeliveryDate: ''
  });

  const fetchOrder = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const parsedId = typeof orderId === 'string' ? parseInt(orderId, 10) : orderId;
      const data = await getOrder(parsedId as OrderId);
      setOrder(data);
      setEditForm(createEditFormFromOrder(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch order details');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
  }, [orderId, fetchOrder]);

  const handleEditChange = (field: keyof OrderEditForm, value: string | number): void => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (): Promise<void> => {
    if (!order) return;
    
    const validation = validateFormData(editForm, order.totalPrice);
    if (!validation.valid) {
      setError(validation.error ?? 'Validation failed');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const updateData: UpdateOrderData = {
        customerName: editForm.customerName.trim(),
        customerId: editForm.customerId.trim(),
        address: editForm.address.trim(),
        orderFrom: editForm.orderFrom as OrderSource,
        status: editForm.status as OrderStatus,
        orderDate: editForm.orderDate || undefined,
        expectedDeliveryDate: editForm.expectedDeliveryDate || undefined,
        paymentStatus: editForm.paymentStatus as PaymentStatus,
        paidAmount: validation.parsedPaidAmount,
        confirmationStatus: editForm.confirmationStatus as ConfirmationStatus,
        customerNotes: editForm.customerNotes,
        priority: Number.parseInt(String(editForm.priority), 10),
        deliveryStatus: editForm.deliveryStatus as DeliveryStatus,
        trackingId: editForm.trackingId.trim(),
        deliveryPartner: editForm.deliveryPartner.trim(),
        actualDeliveryDate: editForm.actualDeliveryDate || undefined
      };

      const parsedId = typeof orderId === 'string' ? parseInt(orderId, 10) : orderId;
      const updatedOrder = await updateOrder(parsedId as OrderId, updateData);
      setOrder(updatedOrder);
      setIsEditing(false);
      if (onOrderUpdated) onOrderUpdated();
      showSuccess(`Order ${updatedOrder.orderId} updated successfully!`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update order';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = (): void => {
    setIsEditing(false);
    setError('');
    if (order) {
      setEditForm(createEditFormFromOrder(order));
    }
  };

  const startEditing = (): void => {
    setIsEditing(true);
  };

  return {
    order,
    loading,
    saving,
    error,
    isEditing,
    editForm,
    setError,
    handleEditChange,
    handleSave,
    handleCancelEdit,
    startEditing,
  };
};
