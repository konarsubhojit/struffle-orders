// @ts-nocheck
import { eq, desc, and, sql, gte, lte, inArray } from 'drizzle-orm';
import { getDatabase } from '@/lib/db/connection';
import { auditLogs, orderAuditTrail, users } from '@/lib/db/schema';
import { executeWithRetry } from '@/lib/utils/dbRetry';
import type { AuditAction, AuditEntityType, CreateAuditLogData, CreateOrderAuditData } from '@/types';

function transformAuditLog(log: any) {
  return {
    ...log,
    _id: log.id,
    previousData: log.previousData ? JSON.parse(log.previousData) : null,
    newData: log.newData ? JSON.parse(log.newData) : null,
    changedFields: log.changedFields ? JSON.parse(log.changedFields) : null,
    metadata: log.metadata ? JSON.parse(log.metadata) : null,
    createdAt: log.createdAt?.toISOString() || null,
  };
}

function transformOrderAuditEntry(entry: any) {
  return {
    ...entry,
    _id: entry.id,
    createdAt: entry.createdAt?.toISOString() || null,
  };
}

/**
 * Calculate which fields changed between two objects
 */
function getChangedFields(oldData: Record<string, unknown>, newData: Record<string, unknown>): string[] {
  const changed: string[] = [];
  const allKeys = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]);
  
  for (const key of allKeys) {
    const oldValue = oldData?.[key];
    const newValue = newData?.[key];
    
    // Deep comparison for objects/arrays
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changed.push(key);
    }
  }
  
  return changed;
}

const AuditLog = {
  /**
   * Create a new audit log entry
   */
  async create(data: CreateAuditLogData) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      
      // Calculate changed fields if both old and new data provided
      let changedFields = data.changedFields;
      if (!changedFields && data.previousData && data.newData) {
        changedFields = getChangedFields(data.previousData, data.newData);
      }
      
      const insertData = {
        entityType: data.entityType,
        entityId: data.entityId,
        action: data.action,
        userId: data.userId || null,
        userEmail: data.userEmail || null,
        userName: data.userName || null,
        previousData: data.previousData ? JSON.stringify(data.previousData) : null,
        newData: data.newData ? JSON.stringify(data.newData) : null,
        changedFields: changedFields ? JSON.stringify(changedFields) : null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      };
      
      const result = await db.insert(auditLogs).values(insertData).returning();
      return transformAuditLog(result[0]);
    }, { operationName: 'AuditLog.create' });
  },

  /**
   * Get audit logs for a specific entity
   */
  async findByEntity(entityType: AuditEntityType, entityId: number, options?: {
    limit?: number;
    offset?: number;
  }) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const limit = options?.limit || 50;
      const offset = options?.offset || 0;

      const result = await db
        .select()
        .from(auditLogs)
        .where(and(
          eq(auditLogs.entityType, entityType),
          eq(auditLogs.entityId, entityId)
        ))
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset);
      
      return result.map(transformAuditLog);
    }, { operationName: 'AuditLog.findByEntity' });
  },

  /**
   * Get all audit logs with pagination
   */
  async findAll(options?: {
    limit?: number;
    offset?: number;
    entityType?: AuditEntityType;
    action?: AuditAction;
    userId?: number;
    startDate?: Date;
    endDate?: Date;
  }) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const limit = options?.limit || 50;
      const offset = options?.offset || 0;

      const conditions = [];
      
      if (options?.entityType) {
        conditions.push(eq(auditLogs.entityType, options.entityType));
      }
      if (options?.action) {
        conditions.push(eq(auditLogs.action, options.action));
      }
      if (options?.userId) {
        conditions.push(eq(auditLogs.userId, options.userId));
      }
      if (options?.startDate) {
        conditions.push(gte(auditLogs.createdAt, options.startDate));
      }
      if (options?.endDate) {
        conditions.push(lte(auditLogs.createdAt, options.endDate));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const result = await db
        .select()
        .from(auditLogs)
        .where(whereClause)
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset);
      
      // Get total count
      const countResult = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(auditLogs)
        .where(whereClause);
      
      const total = countResult[0]?.count || 0;
      
      return {
        items: result.map(transformAuditLog),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + result.length < total,
        },
      };
    }, { operationName: 'AuditLog.findAll' });
  },

  /**
   * Get recent activity (for dashboard)
   */
  async getRecentActivity(limit = 10) {
    return executeWithRetry(async () => {
      const db = getDatabase();

      const result = await db
        .select()
        .from(auditLogs)
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit);
      
      return result.map(transformAuditLog);
    }, { operationName: 'AuditLog.getRecentActivity' });
  },

  /**
   * Cleanup old audit logs (for maintenance)
   */
  async cleanupOld(daysToKeep = 90) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await db
        .delete(auditLogs)
        .where(lte(auditLogs.createdAt, cutoffDate))
        .returning();
      
      return result.length;
    }, { operationName: 'AuditLog.cleanupOld' });
  },

  // ============================================
  // Order-Specific Audit Trail Methods
  // ============================================

  /**
   * Create an order audit trail entry
   */
  async createOrderAudit(data: CreateOrderAuditData) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      
      const insertData = {
        orderId: data.orderId,
        action: data.action,
        fieldName: data.fieldName || null,
        oldValue: data.oldValue || null,
        newValue: data.newValue || null,
        userId: data.userId || null,
        userEmail: data.userEmail || null,
        userName: data.userName || null,
        notes: data.notes || null,
      };
      
      const result = await db.insert(orderAuditTrail).values(insertData).returning();
      return transformOrderAuditEntry(result[0]);
    }, { operationName: 'AuditLog.createOrderAudit' });
  },

  /**
   * Get order audit trail
   */
  async getOrderAuditTrail(orderId: number, options?: {
    limit?: number;
    offset?: number;
  }) {
    return executeWithRetry(async () => {
      const db = getDatabase();
      const numericOrderId = Number.parseInt(String(orderId), 10);
      if (Number.isNaN(numericOrderId)) return [];

      const limit = options?.limit || 100;
      const offset = options?.offset || 0;

      const result = await db
        .select()
        .from(orderAuditTrail)
        .where(eq(orderAuditTrail.orderId, numericOrderId))
        .orderBy(desc(orderAuditTrail.createdAt))
        .limit(limit)
        .offset(offset);
      
      return result.map(transformOrderAuditEntry);
    }, { operationName: 'AuditLog.getOrderAuditTrail' });
  },

  /**
   * Log multiple field changes for an order update
   */
  async logOrderChanges(
    orderId: number,
    oldData: Record<string, unknown>,
    newData: Record<string, unknown>,
    user?: { id?: number; email?: string; name?: string },
    notes?: string
  ) {
    return executeWithRetry(async () => {
      const changedFields = getChangedFields(oldData, newData);
      
      const entries = [];
      for (const field of changedFields) {
        const entry = await this.createOrderAudit({
          orderId,
          action: 'field_update',
          fieldName: field,
          oldValue: String(oldData[field] ?? ''),
          newValue: String(newData[field] ?? ''),
          userId: user?.id,
          userEmail: user?.email,
          userName: user?.name,
          notes,
        });
        entries.push(entry);
      }
      
      return entries;
    }, { operationName: 'AuditLog.logOrderChanges' });
  },

  /**
   * Log order creation
   */
  async logOrderCreated(
    orderId: number,
    orderData: Record<string, unknown>,
    user?: { id?: number; email?: string; name?: string }
  ) {
    return this.createOrderAudit({
      orderId,
      action: 'order_created',
      newValue: JSON.stringify(orderData),
      userId: user?.id,
      userEmail: user?.email,
      userName: user?.name,
    });
  },

  /**
   * Log status change specifically
   */
  async logStatusChange(
    orderId: number,
    oldStatus: string,
    newStatus: string,
    statusType: 'status' | 'payment_status' | 'delivery_status' | 'confirmation_status',
    user?: { id?: number; email?: string; name?: string },
    notes?: string
  ) {
    return this.createOrderAudit({
      orderId,
      action: `${statusType}_change`,
      fieldName: statusType,
      oldValue: oldStatus,
      newValue: newStatus,
      userId: user?.id,
      userEmail: user?.email,
      userName: user?.name,
      notes,
    });
  },

  /**
   * Log items added to order
   */
  async logItemsAdded(
    orderId: number,
    items: Array<{ name: string; quantity: number }>,
    user?: { id?: number; email?: string; name?: string }
  ) {
    const itemsSummary = items.map(i => `${i.name} x${i.quantity}`).join(', ');
    return this.createOrderAudit({
      orderId,
      action: 'items_added',
      newValue: itemsSummary,
      userId: user?.id,
      userEmail: user?.email,
      userName: user?.name,
    });
  },

  /**
   * Log items removed from order
   */
  async logItemsRemoved(
    orderId: number,
    items: Array<{ name: string; quantity: number }>,
    user?: { id?: number; email?: string; name?: string }
  ) {
    const itemsSummary = items.map(i => `${i.name} x${i.quantity}`).join(', ');
    return this.createOrderAudit({
      orderId,
      action: 'items_removed',
      oldValue: itemsSummary,
      userId: user?.id,
      userEmail: user?.email,
      userName: user?.name,
    });
  },
};

export default AuditLog;
