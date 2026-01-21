/**
 * Branded type utility for creating nominal types
 * This prevents accidental mixing of different ID types
 */
declare const __brand: unique symbol;

type Brand<T, TBrand extends string> = T & { readonly [__brand]: TBrand };

// Branded ID types for database entities
export type ItemId = Brand<number, 'ItemId'>;
export type OrderId = Brand<number, 'OrderId'>;
export type OrderItemId = Brand<number, 'OrderItemId'>;
export type FeedbackId = Brand<number, 'FeedbackId'>;
export type FeedbackTokenId = Brand<number, 'FeedbackTokenId'>;

// Helper functions to create branded IDs
export function createItemId(id: number): ItemId {
  return id as ItemId;
}

export function createOrderId(id: number): OrderId {
  return id as OrderId;
}

export function createOrderItemId(id: number): OrderItemId {
  return id as OrderItemId;
}

export function createFeedbackId(id: number): FeedbackId {
  return id as FeedbackId;
}

export function createFeedbackTokenId(id: number): FeedbackTokenId {
  return id as FeedbackTokenId;
}

// Type guard functions
export function isValidId(id: unknown): id is number {
  return typeof id === 'number' && Number.isInteger(id) && id > 0;
}

// Parse string to branded ID (used for URL params)
export function parseItemId(value: string | number): ItemId | null {
  const numericId = typeof value === 'string' ? Number.parseInt(value, 10) : value;
  if (Number.isNaN(numericId) || numericId <= 0) return null;
  return createItemId(numericId);
}

export function parseOrderId(value: string | number): OrderId | null {
  const numericId = typeof value === 'string' ? Number.parseInt(value, 10) : value;
  if (Number.isNaN(numericId) || numericId <= 0) return null;
  return createOrderId(numericId);
}

export function parseFeedbackId(value: string | number): FeedbackId | null {
  const numericId = typeof value === 'string' ? Number.parseInt(value, 10) : value;
  if (Number.isNaN(numericId) || numericId <= 0) return null;
  return createFeedbackId(numericId);
}
