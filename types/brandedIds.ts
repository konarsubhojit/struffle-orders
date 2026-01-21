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
export type CategoryId = Brand<number, 'CategoryId'>;
export type TagId = Brand<number, 'TagId'>;
export type AuditLogId = Brand<number, 'AuditLogId'>;
export type OrderNoteId = Brand<number, 'OrderNoteId'>;
export type CustomerId = Brand<number, 'CustomerId'>;
export type StockTransactionId = Brand<number, 'StockTransactionId'>;

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

export function createCategoryId(id: number): CategoryId {
  return id as CategoryId;
}

export function createTagId(id: number): TagId {
  return id as TagId;
}

export function createAuditLogId(id: number): AuditLogId {
  return id as AuditLogId;
}

export function createOrderNoteId(id: number): OrderNoteId {
  return id as OrderNoteId;
}

export function createCustomerId(id: number): CustomerId {
  return id as CustomerId;
}

export function createStockTransactionId(id: number): StockTransactionId {
  return id as StockTransactionId;
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

export function parseCategoryId(value: string | number): CategoryId | null {
  const numericId = typeof value === 'string' ? Number.parseInt(value, 10) : value;
  if (Number.isNaN(numericId) || numericId <= 0) return null;
  return createCategoryId(numericId);
}

export function parseTagId(value: string | number): TagId | null {
  const numericId = typeof value === 'string' ? Number.parseInt(value, 10) : value;
  if (Number.isNaN(numericId) || numericId <= 0) return null;
  return createTagId(numericId);
}

export function parseAuditLogId(value: string | number): AuditLogId | null {
  const numericId = typeof value === 'string' ? Number.parseInt(value, 10) : value;
  if (Number.isNaN(numericId) || numericId <= 0) return null;
  return createAuditLogId(numericId);
}

export function parseOrderNoteId(value: string | number): OrderNoteId | null {
  const numericId = typeof value === 'string' ? Number.parseInt(value, 10) : value;
  if (Number.isNaN(numericId) || numericId <= 0) return null;
  return createOrderNoteId(numericId);
}

export function parseCustomerId(value: string | number): CustomerId | null {
  const numericId = typeof value === 'string' ? Number.parseInt(value, 10) : value;
  if (Number.isNaN(numericId) || numericId <= 0) return null;
  return createCustomerId(numericId);
}

export function parseStockTransactionId(value: string | number): StockTransactionId | null {
  const numericId = typeof value === 'string' ? Number.parseInt(value, 10) : value;
  if (Number.isNaN(numericId) || numericId <= 0) return null;
  return createStockTransactionId(numericId);
}
