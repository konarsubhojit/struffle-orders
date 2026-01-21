// @ts-nocheck
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';
import { getDatabase } from '@/lib/db/connection';
import { orders, orderItems, items, importExportJobs } from '@/lib/db/schema';
import Order from '@/lib/models/Order';
import Item from '@/lib/models/Item';
import AuditLog from '@/lib/models/AuditLog';
import { executeWithRetry } from '@/lib/utils/dbRetry';
import { createLogger } from '@/lib/utils/logger';
import type { 
  ImportExportJob, 
  ImportError, 
  BulkOrderImportData, 
  OrderExportData,
  OrderSource,
  PaymentStatus,
  ConfirmationStatus
} from '@/types';

const logger = createLogger('ImportExportService');

// Valid enum values for validation
const VALID_ORDER_SOURCES: OrderSource[] = ['instagram', 'facebook', 'whatsapp', 'call', 'offline'];
const VALID_PAYMENT_STATUSES: PaymentStatus[] = ['unpaid', 'partially_paid', 'paid', 'cash_on_delivery', 'refunded'];
const VALID_CONFIRMATION_STATUSES: ConfirmationStatus[] = ['unconfirmed', 'pending_confirmation', 'confirmed', 'cancelled'];

function transformJob(job: any): ImportExportJob {
  return {
    ...job,
    _id: job.id,
    errors: job.errors ? JSON.parse(job.errors) : null,
    startedAt: job.startedAt?.toISOString() || null,
    completedAt: job.completedAt?.toISOString() || null,
    createdAt: job.createdAt?.toISOString() || null,
  };
}

/**
 * Validate a single order import row
 */
function validateOrderRow(row: any, rowIndex: number): { valid: boolean; errors: ImportError[]; data?: BulkOrderImportData } {
  const errors: ImportError[] = [];
  
  // Required fields
  if (!row.customerName?.trim()) {
    errors.push({ row: rowIndex, field: 'customerName', message: 'Customer name is required' });
  }
  if (!row.customerId?.trim()) {
    errors.push({ row: rowIndex, field: 'customerId', message: 'Customer ID is required' });
  }
  if (!row.orderFrom) {
    errors.push({ row: rowIndex, field: 'orderFrom', message: 'Order source is required' });
  } else if (!VALID_ORDER_SOURCES.includes(row.orderFrom.toLowerCase())) {
    errors.push({ 
      row: rowIndex, 
      field: 'orderFrom', 
      message: `Invalid order source. Must be one of: ${VALID_ORDER_SOURCES.join(', ')}` 
    });
  }
  
  // Validate optional enum fields
  if (row.paymentStatus && !VALID_PAYMENT_STATUSES.includes(row.paymentStatus.toLowerCase())) {
    errors.push({ 
      row: rowIndex, 
      field: 'paymentStatus', 
      message: `Invalid payment status. Must be one of: ${VALID_PAYMENT_STATUSES.join(', ')}` 
    });
  }
  if (row.confirmationStatus && !VALID_CONFIRMATION_STATUSES.includes(row.confirmationStatus.toLowerCase())) {
    errors.push({ 
      row: rowIndex, 
      field: 'confirmationStatus', 
      message: `Invalid confirmation status. Must be one of: ${VALID_CONFIRMATION_STATUSES.join(', ')}` 
    });
  }
  
  // Validate numeric fields
  if (row.paidAmount !== undefined && row.paidAmount !== '') {
    const paidAmount = Number.parseFloat(row.paidAmount);
    if (Number.isNaN(paidAmount) || paidAmount < 0) {
      errors.push({ row: rowIndex, field: 'paidAmount', message: 'Paid amount must be a valid non-negative number' });
    }
  }
  if (row.priority !== undefined && row.priority !== '') {
    const priority = Number.parseInt(row.priority, 10);
    if (Number.isNaN(priority) || priority < 0 || priority > 5) {
      errors.push({ row: rowIndex, field: 'priority', message: 'Priority must be a number between 0 and 5' });
    }
  }
  
  // Validate dates
  if (row.orderDate) {
    const date = new Date(row.orderDate);
    if (Number.isNaN(date.getTime())) {
      errors.push({ row: rowIndex, field: 'orderDate', message: 'Invalid order date format' });
    }
  }
  if (row.expectedDeliveryDate) {
    const date = new Date(row.expectedDeliveryDate);
    if (Number.isNaN(date.getTime())) {
      errors.push({ row: rowIndex, field: 'expectedDeliveryDate', message: 'Invalid expected delivery date format' });
    }
  }
  
  // Validate items
  let parsedItems: Array<{ itemName: string; itemId?: number; price: number; quantity: number; customizationRequest?: string }> = [];
  
  if (row.items) {
    // Items can be a string (semicolon-separated) or already parsed array
    if (typeof row.items === 'string') {
      const itemStrings = row.items.split(';').map((s: string) => s.trim()).filter(Boolean);
      for (const itemStr of itemStrings) {
        // Format: "Item Name x2 @100" or "Item Name x2" or just "Item Name"
        const match = itemStr.match(/^(.+?)(?:\s+x(\d+))?(?:\s+@(\d+(?:\.\d+)?))?$/);
        if (match) {
          parsedItems.push({
            itemName: match[1].trim(),
            quantity: match[2] ? Number.parseInt(match[2], 10) : 1,
            price: match[3] ? Number.parseFloat(match[3]) : 0,
          });
        } else {
          errors.push({ row: rowIndex, field: 'items', message: `Could not parse item: ${itemStr}` });
        }
      }
    } else if (Array.isArray(row.items)) {
      parsedItems = row.items;
    }
  }
  
  if (parsedItems.length === 0) {
    errors.push({ row: rowIndex, field: 'items', message: 'At least one item is required' });
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return {
    valid: true,
    errors: [],
    data: {
      orderFrom: row.orderFrom.toLowerCase() as OrderSource,
      customerName: row.customerName.trim(),
      customerId: row.customerId.trim(),
      address: row.address?.trim(),
      orderDate: row.orderDate,
      expectedDeliveryDate: row.expectedDeliveryDate,
      paymentStatus: row.paymentStatus?.toLowerCase() as PaymentStatus,
      paidAmount: row.paidAmount ? Number.parseFloat(row.paidAmount) : undefined,
      confirmationStatus: row.confirmationStatus?.toLowerCase() as ConfirmationStatus,
      customerNotes: row.customerNotes?.trim(),
      priority: row.priority ? Number.parseInt(row.priority, 10) : undefined,
      items: parsedItems,
    },
  };
}

const ImportExportService = {
  /**
   * Create an import/export job record
   */
  async createJob(data: {
    jobType: 'import' | 'export';
    entityType: string;
    fileName?: string;
    totalRecords?: number;
    userId?: number;
    userEmail?: string;
  }) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      
      const result = await db.insert(importExportJobs).values({
        jobType: data.jobType,
        entityType: data.entityType,
        status: 'pending',
        fileName: data.fileName || null,
        totalRecords: data.totalRecords || null,
        userId: data.userId || null,
        userEmail: data.userEmail || null,
      }).returning();
      
      return transformJob(result[0]);
    }, { operationName: 'ImportExportService.createJob' });
  },

  /**
   * Update job status
   */
  async updateJob(jobId: number, updates: {
    status?: string;
    processedRecords?: number;
    successCount?: number;
    errorCount?: number;
    errors?: ImportError[];
    fileUrl?: string;
    startedAt?: Date;
    completedAt?: Date;
  }) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      
      const updateData: any = {};
      if (updates.status) updateData.status = updates.status;
      if (updates.processedRecords !== undefined) updateData.processedRecords = updates.processedRecords;
      if (updates.successCount !== undefined) updateData.successCount = updates.successCount;
      if (updates.errorCount !== undefined) updateData.errorCount = updates.errorCount;
      if (updates.errors !== undefined) updateData.errors = JSON.stringify(updates.errors);
      if (updates.fileUrl) updateData.fileUrl = updates.fileUrl;
      if (updates.startedAt) updateData.startedAt = updates.startedAt;
      if (updates.completedAt) updateData.completedAt = updates.completedAt;
      
      const result = await db
        .update(importExportJobs)
        .set(updateData)
        .where(eq(importExportJobs.id, jobId))
        .returning();
      
      return result.length > 0 ? transformJob(result[0]) : null;
    }, { operationName: 'ImportExportService.updateJob' });
  },

  /**
   * Get job by ID
   */
  async getJob(jobId: number) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      
      const result = await db
        .select()
        .from(importExportJobs)
        .where(eq(importExportJobs.id, jobId));
      
      return result.length > 0 ? transformJob(result[0]) : null;
    }, { operationName: 'ImportExportService.getJob' });
  },

  /**
   * Get recent jobs for a user
   */
  async getRecentJobs(options?: { userId?: number; limit?: number }) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const limit = options?.limit || 20;
      
      let query = db.select().from(importExportJobs);
      
      if (options?.userId) {
        query = query.where(eq(importExportJobs.userId, options.userId)) as typeof query;
      }
      
      const result = await query
        .orderBy(desc(importExportJobs.createdAt))
        .limit(limit);
      
      return result.map(transformJob);
    }, { operationName: 'ImportExportService.getRecentJobs' });
  },

  /**
   * Import orders from parsed data
   */
  async importOrders(
    rows: any[],
    jobId: number,
    user?: { id?: number; email?: string; name?: string }
  ): Promise<{ successCount: number; errorCount: number; errors: ImportError[] }> {
    const allErrors: ImportError[] = [];
    let successCount = 0;
    let errorCount = 0;
    
    // Update job status to processing
    await this.updateJob(jobId, { 
      status: 'processing', 
      startedAt: new Date(),
      totalRecords: rows.length 
    });
    
    // First, fetch all items to match by name
    const allItems = await Item.find();
    const itemsByName = new Map(allItems.map(item => [item.name.toLowerCase(), item]));
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIndex = i + 2; // +2 for 1-indexed and header row
      
      try {
        // Validate row
        const validation = validateOrderRow(row, rowIndex);
        if (!validation.valid) {
          allErrors.push(...validation.errors);
          errorCount++;
          continue;
        }
        
        const orderData = validation.data!;
        
        // Match items to existing items
        const matchedItems = [];
        for (const itemData of orderData.items) {
          let item = itemsByName.get(itemData.itemName.toLowerCase());
          
          // If item has an ID, try to use that
          if (itemData.itemId) {
            item = allItems.find(i => i.id === itemData.itemId) || item;
          }
          
          if (!item) {
            // Create a placeholder item entry without a real item reference
            matchedItems.push({
              itemId: null, // Will be handled specially
              name: itemData.itemName,
              price: itemData.price || 0,
              quantity: itemData.quantity || 1,
              customizationRequest: itemData.customizationRequest || '',
            });
          } else {
            matchedItems.push({
              itemId: item.id,
              name: item.name,
              price: itemData.price || item.price,
              quantity: itemData.quantity || 1,
              customizationRequest: itemData.customizationRequest || '',
            });
          }
        }
        
        // Check if any items don't have a match
        const unmatchedItems = matchedItems.filter(i => i.itemId === null);
        if (unmatchedItems.length > 0) {
          allErrors.push({
            row: rowIndex,
            field: 'items',
            message: `Could not find items: ${unmatchedItems.map(i => i.name).join(', ')}`,
          });
          errorCount++;
          continue;
        }
        
        // Create the order
        const order = await Order.create({
          orderFrom: orderData.orderFrom,
          customerName: orderData.customerName,
          customerId: orderData.customerId,
          address: orderData.address,
          orderDate: orderData.orderDate,
          expectedDeliveryDate: orderData.expectedDeliveryDate,
          paymentStatus: orderData.paymentStatus,
          paidAmount: orderData.paidAmount,
          confirmationStatus: orderData.confirmationStatus,
          customerNotes: orderData.customerNotes,
          priority: orderData.priority,
          items: matchedItems.map(item => ({
            item: item.itemId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            customizationRequest: item.customizationRequest,
          })),
        });
        
        // Log audit entry
        await AuditLog.create({
          entityType: 'order',
          entityId: order.id,
          action: 'bulk_import',
          userId: user?.id,
          userEmail: user?.email,
          userName: user?.name,
          newData: { orderId: order.orderId },
          metadata: { jobId, rowIndex },
        });
        
        successCount++;
      } catch (error) {
        logger.error(`Import error at row ${rowIndex}`, error);
        allErrors.push({
          row: rowIndex,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        errorCount++;
      }
      
      // Update progress every 10 rows
      if (i % 10 === 0) {
        await this.updateJob(jobId, {
          processedRecords: i + 1,
          successCount,
          errorCount,
        });
      }
    }
    
    // Final update
    await this.updateJob(jobId, {
      status: 'completed',
      processedRecords: rows.length,
      successCount,
      errorCount,
      errors: allErrors,
      completedAt: new Date(),
    });
    
    return { successCount, errorCount, errors: allErrors };
  },

  /**
   * Export orders to data format
   */
  async exportOrders(options?: {
    startDate?: Date;
    endDate?: Date;
    status?: string;
  }): Promise<OrderExportData[]> {
    return executeWithRetry(async () => {
      const db = getDatabase();
      
      const conditions = [];
      if (options?.startDate) {
        conditions.push(gte(orders.createdAt, options.startDate));
      }
      if (options?.endDate) {
        conditions.push(lte(orders.createdAt, options.endDate));
      }
      if (options?.status) {
        conditions.push(eq(orders.status, options.status));
      }
      
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      // Get orders
      const ordersData = await db
        .select()
        .from(orders)
        .where(whereClause)
        .orderBy(desc(orders.createdAt));
      
      // Get all order items
      const orderIds = ordersData.map(o => o.id);
      const allOrderItems = orderIds.length > 0 
        ? await db
            .select()
            .from(orderItems)
            .where(sql`${orderItems.orderId} = ANY(${orderIds})`)
        : [];
      
      // Group items by order ID
      const itemsByOrderId = new Map<number, typeof allOrderItems>();
      for (const item of allOrderItems) {
        if (!itemsByOrderId.has(item.orderId)) {
          itemsByOrderId.set(item.orderId, []);
        }
        itemsByOrderId.get(item.orderId)!.push(item);
      }
      
      // Transform to export format
      return ordersData.map(order => {
        const items = itemsByOrderId.get(order.id) || [];
        const itemsSummary = items
          .map(i => `${i.name} x${i.quantity}`)
          .join('; ');
        
        return {
          orderId: order.orderId,
          orderFrom: order.orderFrom as OrderSource,
          customerName: order.customerName,
          customerId: order.customerId,
          address: order.address || '',
          totalPrice: Number.parseFloat(order.totalPrice),
          status: order.status as any,
          paymentStatus: order.paymentStatus as PaymentStatus,
          paidAmount: Number.parseFloat(order.paidAmount || '0'),
          confirmationStatus: order.confirmationStatus as ConfirmationStatus,
          customerNotes: order.customerNotes || '',
          priority: order.priority || 0,
          orderDate: order.orderDate?.toISOString() || null,
          expectedDeliveryDate: order.expectedDeliveryDate?.toISOString() || null,
          deliveryStatus: order.deliveryStatus as any,
          trackingId: order.trackingId || '',
          deliveryPartner: order.deliveryPartner || '',
          actualDeliveryDate: order.actualDeliveryDate?.toISOString() || null,
          createdAt: order.createdAt.toISOString(),
          itemCount: items.length,
          items: itemsSummary,
        };
      });
    }, { operationName: 'ImportExportService.exportOrders' });
  },

  /**
   * Parse CSV content
   */
  parseCSV(content: string): any[] {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    // Parse header
    const headers = this.parseCSVLine(lines[0]);
    
    // Parse rows
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const row: any = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = values[j] || '';
      }
      rows.push(row);
    }
    
    return rows;
  },

  /**
   * Parse a single CSV line handling quoted values
   */
  parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    values.push(current.trim());
    return values;
  },

  /**
   * Generate CSV content from data
   */
  generateCSV(data: any[], columns: { key: string; header: string }[]): string {
    const headers = columns.map(c => c.header);
    const lines = [headers.join(',')];
    
    for (const row of data) {
      const values = columns.map(col => {
        const value = row[col.key];
        if (value === null || value === undefined) return '';
        const str = String(value);
        // Escape quotes and wrap in quotes if contains comma or newline
        if (str.includes(',') || str.includes('\n') || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });
      lines.push(values.join(','));
    }
    
    return lines.join('\n');
  },
};

export default ImportExportService;
