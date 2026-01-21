import type { OrderSource, OrderStatus, PaymentStatus, ConfirmationStatus, DeliveryStatus } from '../types';

interface StatusOption<T extends string> {
  value: T;
  label: string;
}

interface PriorityOption {
  value: number;
  label: string;
}

export const ORDER_SOURCES: StatusOption<OrderSource>[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'call', label: 'Call' },
  { value: 'offline', label: 'Offline' },
];

export const ORDER_STATUSES: StatusOption<OrderStatus>[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const PAYMENT_STATUSES: StatusOption<PaymentStatus>[] = [
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'partially_paid', label: 'Partially Paid' },
  { value: 'paid', label: 'Paid' },
  { value: 'cash_on_delivery', label: 'Cash on Delivery' },
  { value: 'refunded', label: 'Refunded' },
];

export const CONFIRMATION_STATUSES: StatusOption<ConfirmationStatus>[] = [
  { value: 'unconfirmed', label: 'Unconfirmed' },
  { value: 'pending_confirmation', label: 'Pending Confirmation' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const DELIVERY_STATUSES: StatusOption<DeliveryStatus>[] = [
  { value: 'not_shipped', label: 'Not Shipped' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'returned', label: 'Returned' },
];

export const PRIORITY_LEVELS: PriorityOption[] = [
  { value: 0, label: 'Normal' },
  { value: 1, label: 'Low Priority' },
  { value: 2, label: 'Medium Priority' },
  { value: 3, label: 'High Priority' },
  { value: 4, label: 'Urgent' },
  { value: 5, label: 'Critical' },
];

const findLabel = <T extends string | number>(
  array: Array<{ value: T; label: string }>, 
  value: T, 
  defaultLabel: string
): string => 
  array.find(s => s.value === value)?.label ?? defaultLabel;

export const getPaymentStatusLabel = (status: string): string => 
  findLabel(PAYMENT_STATUSES, status as PaymentStatus, 'Unpaid');

export const getConfirmationStatusLabel = (status: string): string => 
  findLabel(CONFIRMATION_STATUSES, status as ConfirmationStatus, 'Unconfirmed');

export const getPriorityLabel = (priority: number): string => 
  findLabel(PRIORITY_LEVELS, priority, 'Normal');

export const getOrderStatusLabel = (status: string): string => 
  findLabel(ORDER_STATUSES, status as OrderStatus, 'Pending');

export const getDeliveryStatusLabel = (status: string): string => 
  findLabel(DELIVERY_STATUSES, status as DeliveryStatus, 'Not Shipped');
