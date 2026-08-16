import type { CreateItemData, CreateOrderData, Item, Order } from '@/types';
import { getOfflineQueue, notifyOfflineQueueChanged, requestBackgroundSync } from './queue';

function createIdempotencyKey(type: 'order' | 'item'): string {
  return `${type}:${crypto.randomUUID()}`;
}

function isOfflineError(error: unknown): boolean {
  return typeof navigator !== 'undefined' && (!navigator.onLine || error instanceof TypeError);
}

async function post<T>(
  endpoint: '/api/orders' | '/api/items',
  body: Record<string, unknown>,
  idempotencyKey: string,
): Promise<T> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({ message: 'Request failed' }));
  if (!response.ok) {
    if (response.status === 409 && data.duplicate && data.resource) return data.resource as T;
    throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
  }
  return data as T;
}

export async function createOrderOfflineFirst(data: CreateOrderData): Promise<Order> {
  const idempotencyKey = createIdempotencyKey('order');
  try {
    return await post<Order>('/api/orders', data as unknown as Record<string, unknown>, idempotencyKey);
  } catch (error) {
    if (!isOfflineError(error)) throw error;
  }

  const temporaryId = -Date.now();
  await getOfflineQueue().enqueue({
    id: idempotencyKey,
    idempotencyKey,
    type: 'order',
    label: `Order for ${data.customerName}`,
    endpoint: '/api/orders',
    body: data as unknown as Record<string, unknown>,
    status: 'pending',
    createdAt: new Date().toISOString(),
  });
  notifyOfflineQueueChanged();
  await requestBackgroundSync().catch(() => undefined);

  return {
    id: temporaryId,
    _id: temporaryId,
    orderId: `PENDING-${Math.abs(temporaryId)}`,
    ...data,
    address: data.address || '',
    totalPrice: data.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    status: 'pending',
    paymentStatus: data.paymentStatus || 'unpaid',
    paidAmount: data.paidAmount || 0,
    confirmationStatus: data.confirmationStatus || 'unconfirmed',
    customerNotes: data.customerNotes || '',
    priority: data.priority || 0,
    orderDate: data.orderDate || new Date().toISOString(),
    expectedDeliveryDate: data.expectedDeliveryDate || null,
    deliveryStatus: data.deliveryStatus || 'not_shipped',
    trackingId: data.trackingId || '',
    deliveryPartner: data.deliveryPartner || '',
    actualDeliveryDate: data.actualDeliveryDate || null,
    createdAt: new Date().toISOString(),
    items: data.items.map((item, index) => ({
      id: temporaryId - index - 1,
      _id: temporaryId - index - 1,
      item: item.itemId,
      designId: item.designId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      customizationRequest: item.customizationRequest || '',
    })),
  } as Order;
}

export async function createItemOfflineFirst(data: CreateItemData): Promise<Item> {
  const idempotencyKey = createIdempotencyKey('item');
  try {
    return await post<Item>('/api/items', data as unknown as Record<string, unknown>, idempotencyKey);
  } catch (error) {
    if (!isOfflineError(error)) throw error;
  }

  const temporaryId = -Date.now();
  await getOfflineQueue().enqueue({
    id: idempotencyKey,
    idempotencyKey,
    type: 'item',
    label: data.name,
    endpoint: '/api/items',
    body: data as unknown as Record<string, unknown>,
    status: 'pending',
    createdAt: new Date().toISOString(),
  });
  notifyOfflineQueueChanged();
  await requestBackgroundSync().catch(() => undefined);

  return {
    id: temporaryId,
    _id: temporaryId,
    name: data.name,
    price: data.price,
    color: data.color || '',
    fabric: data.fabric || '',
    specialFeatures: data.specialFeatures || '',
    imageUrl: data.image || '',
    createdAt: new Date().toISOString(),
    deletedAt: null,
    stockQuantity: 0,
    lowStockThreshold: 5,
    trackStock: false,
    costPrice: null,
    supplierName: null,
    supplierSku: null,
  } as Item;
}
