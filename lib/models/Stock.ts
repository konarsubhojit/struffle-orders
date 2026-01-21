// @ts-nocheck
import { eq, desc, sql, and, lte, inArray } from 'drizzle-orm';
import { getDatabase } from '@/lib/db/connection';
import { items, stockTransactions } from '@/lib/db/schema';
import { executeWithRetry } from '@/lib/utils/dbRetry';

/**
 * Transform item with stock info for API responses
 */
function transformItemWithStock(item: any) {
  return {
    id: item.id,
    _id: item.id,
    name: item.name,
    price: item.price ? Number.parseFloat(item.price) : null,
    imageUrl: item.imageUrl || '',
    stockQuantity: item.stockQuantity ?? 0,
    lowStockThreshold: item.lowStockThreshold ?? 5,
    trackStock: item.trackStock ?? false,
    isLowStock: item.trackStock && item.stockQuantity <= item.lowStockThreshold,
    costPrice: item.costPrice ? Number.parseFloat(item.costPrice) : null,
    supplierName: item.supplierName || null,
    supplierSku: item.supplierSku || null,
    createdAt: item.createdAt,
  };
}

/**
 * Transform stock transaction for API responses
 */
function transformTransaction(transaction: any) {
  return {
    id: transaction.id,
    _id: transaction.id,
    itemId: transaction.itemId,
    transactionType: transaction.transactionType,
    quantity: transaction.quantity,
    previousStock: transaction.previousStock,
    newStock: transaction.newStock,
    referenceType: transaction.referenceType || null,
    referenceId: transaction.referenceId || null,
    notes: transaction.notes || null,
    userId: transaction.userId || null,
    userEmail: transaction.userEmail || null,
    createdAt: transaction.createdAt,
  };
}

const Stock = {
  /**
   * Get stock info for a specific item
   * @param itemId - The item ID
   * @returns Stock info including item details, or null if not found
   */
  async getItemStock(itemId: number) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const numericId = Number.parseInt(String(itemId), 10);
      if (Number.isNaN(numericId)) return null;

      const result = await db
        .select({
          id: items.id,
          name: items.name,
          price: items.price,
          imageUrl: items.imageUrl,
          stockQuantity: items.stockQuantity,
          lowStockThreshold: items.lowStockThreshold,
          trackStock: items.trackStock,
          costPrice: items.costPrice,
          supplierName: items.supplierName,
          supplierSku: items.supplierSku,
          createdAt: items.createdAt,
        })
        .from(items)
        .where(eq(items.id, numericId));

      if (result.length === 0) return null;
      return transformItemWithStock(result[0]);
    }, { operationName: 'Stock.getItemStock' });
  },

  /**
   * Get all items where stockQuantity <= lowStockThreshold AND trackStock = true
   * @returns Array of items with low stock
   */
  async getLowStockItems() {
    return executeWithRetry(async () => {
      const db = getDatabase();

      const result = await db
        .select({
          id: items.id,
          name: items.name,
          price: items.price,
          imageUrl: items.imageUrl,
          stockQuantity: items.stockQuantity,
          lowStockThreshold: items.lowStockThreshold,
          trackStock: items.trackStock,
          costPrice: items.costPrice,
          supplierName: items.supplierName,
          supplierSku: items.supplierSku,
          createdAt: items.createdAt,
        })
        .from(items)
        .where(
          and(
            eq(items.trackStock, true),
            sql`${items.stockQuantity} <= ${items.lowStockThreshold}`
          )
        )
        .orderBy(items.stockQuantity);

      return result.map(transformItemWithStock);
    }, { operationName: 'Stock.getLowStockItems' });
  },

  /**
   * Adjust stock for an item - creates transaction and updates item stockQuantity
   * @param itemId - The item ID
   * @param quantity - The quantity to adjust (positive or negative)
   * @param transactionType - Type of transaction
   * @param notes - Optional notes
   * @param userId - Optional user ID who made the adjustment
   * @param userEmail - Optional user email
   * @param referenceType - Optional reference type (e.g., 'order')
   * @param referenceId - Optional reference ID
   * @returns The created transaction
   */
  async adjustStock(
    itemId: number,
    quantity: number,
    transactionType: 'order_placed' | 'order_cancelled' | 'adjustment' | 'restock' | 'return',
    notes?: string,
    userId?: number,
    userEmail?: string,
    referenceType?: string,
    referenceId?: number
  ) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const numericId = Number.parseInt(String(itemId), 10);
      if (Number.isNaN(numericId)) {
        throw new Error('Invalid item ID');
      }

      // Get current stock
      const itemResult = await db
        .select({ stockQuantity: items.stockQuantity, trackStock: items.trackStock })
        .from(items)
        .where(eq(items.id, numericId));

      if (itemResult.length === 0) {
        throw new Error('Item not found');
      }

      const currentStock = itemResult[0].stockQuantity ?? 0;
      const newStock = currentStock + quantity;

      // Don't allow negative stock
      if (newStock < 0) {
        throw new Error(`Insufficient stock. Current: ${currentStock}, Requested adjustment: ${quantity}`);
      }

      // Create transaction record
      const transactionResult = await db
        .insert(stockTransactions)
        .values({
          itemId: numericId,
          transactionType,
          quantity,
          previousStock: currentStock,
          newStock,
          notes: notes?.trim() || null,
          userId: userId || null,
          userEmail: userEmail || null,
          referenceType: referenceType || null,
          referenceId: referenceId || null,
        })
        .returning();

      // Update item stock quantity
      await db
        .update(items)
        .set({ stockQuantity: newStock })
        .where(eq(items.id, numericId));

      return transformTransaction(transactionResult[0]);
    }, { operationName: 'Stock.adjustStock' });
  },

  /**
   * Get transaction history for an item with pagination
   * @param itemId - The item ID
   * @param options - Pagination options
   * @returns Paginated transaction history
   */
  async getTransactionHistory(
    itemId: number,
    options: { page?: number; limit?: number } = {}
  ) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const numericId = Number.parseInt(String(itemId), 10);
      if (Number.isNaN(numericId)) {
        throw new Error('Invalid item ID');
      }

      const page = Math.max(1, options.page || 1);
      const limit = Math.min(100, Math.max(1, options.limit || 20));
      const offset = (page - 1) * limit;

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(stockTransactions)
        .where(eq(stockTransactions.itemId, numericId));

      const total = countResult[0]?.count || 0;

      // Get paginated transactions
      const transactions = await db
        .select()
        .from(stockTransactions)
        .where(eq(stockTransactions.itemId, numericId))
        .orderBy(desc(stockTransactions.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        transactions: transactions.map(transformTransaction),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }, { operationName: 'Stock.getTransactionHistory' });
  },

  /**
   * Bulk adjust stock for multiple items
   * @param adjustments - Array of { itemId, quantity, notes }
   * @param transactionType - Type of transaction for all adjustments
   * @param userId - Optional user ID
   * @param userEmail - Optional user email
   * @returns Results with success and failure counts
   */
  async bulkAdjust(
    adjustments: Array<{ itemId: number; quantity: number; notes?: string }>,
    transactionType: 'adjustment' | 'restock' = 'adjustment',
    userId?: number,
    userEmail?: string
  ) {
    return executeWithRetry(async () => {
      const results: Array<{ itemId: number; success: boolean; error?: string; transaction?: any }> = [];

      for (const adj of adjustments) {
        try {
          const transaction = await this.adjustStock(
            adj.itemId,
            adj.quantity,
            transactionType,
            adj.notes,
            userId,
            userEmail
          );
          results.push({ itemId: adj.itemId, success: true, transaction });
        } catch (error: any) {
          results.push({ itemId: adj.itemId, success: false, error: error.message });
        }
      }

      return {
        results,
        summary: {
          total: adjustments.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
        },
      };
    }, { operationName: 'Stock.bulkAdjust' });
  },

  /**
   * Deduct stock when an order is placed
   * Only deducts for items that have trackStock = true
   * @param orderId - The order ID
   * @param orderItems - Array of { itemId, quantity }
   * @param userId - Optional user ID
   * @param userEmail - Optional user email
   * @returns Results of the stock deductions
   */
  async deductForOrder(
    orderId: number,
    orderItems: Array<{ itemId: number; quantity: number }>,
    userId?: number,
    userEmail?: string
  ) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const results: Array<{ itemId: number; success: boolean; error?: string; deducted: boolean }> = [];

      for (const item of orderItems) {
        try {
          // Check if item tracks stock
          const itemResult = await db
            .select({ trackStock: items.trackStock })
            .from(items)
            .where(eq(items.id, item.itemId));

          if (itemResult.length === 0) {
            results.push({ itemId: item.itemId, success: false, error: 'Item not found', deducted: false });
            continue;
          }

          if (!itemResult[0].trackStock) {
            // Item doesn't track stock, skip
            results.push({ itemId: item.itemId, success: true, deducted: false });
            continue;
          }

          // Deduct stock (negative quantity)
          await this.adjustStock(
            item.itemId,
            -item.quantity,
            'order_placed',
            `Order #${orderId}`,
            userId,
            userEmail,
            'order',
            orderId
          );
          results.push({ itemId: item.itemId, success: true, deducted: true });
        } catch (error: any) {
          results.push({ itemId: item.itemId, success: false, error: error.message, deducted: false });
        }
      }

      return {
        orderId,
        results,
        summary: {
          total: orderItems.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          deducted: results.filter(r => r.deducted).length,
        },
      };
    }, { operationName: 'Stock.deductForOrder' });
  },

  /**
   * Restore stock when an order is cancelled
   * Only restores for items that have trackStock = true
   * @param orderId - The order ID
   * @param orderItems - Array of { itemId, quantity }
   * @param userId - Optional user ID
   * @param userEmail - Optional user email
   * @returns Results of the stock restorations
   */
  async restoreForOrder(
    orderId: number,
    orderItems: Array<{ itemId: number; quantity: number }>,
    userId?: number,
    userEmail?: string
  ) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const results: Array<{ itemId: number; success: boolean; error?: string; restored: boolean }> = [];

      for (const item of orderItems) {
        try {
          // Check if item tracks stock
          const itemResult = await db
            .select({ trackStock: items.trackStock })
            .from(items)
            .where(eq(items.id, item.itemId));

          if (itemResult.length === 0) {
            results.push({ itemId: item.itemId, success: false, error: 'Item not found', restored: false });
            continue;
          }

          if (!itemResult[0].trackStock) {
            // Item doesn't track stock, skip
            results.push({ itemId: item.itemId, success: true, restored: false });
            continue;
          }

          // Restore stock (positive quantity)
          await this.adjustStock(
            item.itemId,
            item.quantity,
            'order_cancelled',
            `Order #${orderId} cancelled`,
            userId,
            userEmail,
            'order',
            orderId
          );
          results.push({ itemId: item.itemId, success: true, restored: true });
        } catch (error: any) {
          results.push({ itemId: item.itemId, success: false, error: error.message, restored: false });
        }
      }

      return {
        orderId,
        results,
        summary: {
          total: orderItems.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          restored: results.filter(r => r.restored).length,
        },
      };
    }, { operationName: 'Stock.restoreForOrder' });
  },

  /**
   * Get all items with stock info for inventory view
   * @param options - Filter and pagination options
   * @returns Paginated items with stock info
   */
  async getAllItemsWithStock(options: {
    lowStockOnly?: boolean;
    page?: number;
    limit?: number;
  } = {}) {
    return executeWithRetry(async () => {
      const db = getDatabase();

      const page = Math.max(1, options.page || 1);
      const limit = Math.min(100, Math.max(1, options.limit || 20));
      const offset = (page - 1) * limit;

      // Build where conditions
      const conditions = [];
      if (options.lowStockOnly) {
        conditions.push(eq(items.trackStock, true));
        conditions.push(sql`${items.stockQuantity} <= ${items.lowStockThreshold}`);
      }

      // Get total count
      const countQuery = db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(items);

      if (conditions.length > 0) {
        countQuery.where(and(...conditions));
      }

      const countResult = await countQuery;
      const total = countResult[0]?.count || 0;

      // Get paginated items
      const itemsQuery = db
        .select({
          id: items.id,
          name: items.name,
          price: items.price,
          imageUrl: items.imageUrl,
          stockQuantity: items.stockQuantity,
          lowStockThreshold: items.lowStockThreshold,
          trackStock: items.trackStock,
          costPrice: items.costPrice,
          supplierName: items.supplierName,
          supplierSku: items.supplierSku,
          createdAt: items.createdAt,
        })
        .from(items);

      if (conditions.length > 0) {
        itemsQuery.where(and(...conditions));
      }

      const result = await itemsQuery
        .orderBy(items.stockQuantity)
        .limit(limit)
        .offset(offset);

      return {
        items: result.map(transformItemWithStock),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }, { operationName: 'Stock.getAllItemsWithStock' });
  },
};

export default Stock;
