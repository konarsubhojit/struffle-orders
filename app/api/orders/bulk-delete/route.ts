import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { inArray } from 'drizzle-orm';
import { authOptions } from '@/lib/auth';
import { getDatabase } from '@/lib/db/connection';
import { orders, orderItems } from '@/lib/db/schema';
import { executeWithRetry } from '@/lib/utils/dbRetry';
import AuditLog from '@/lib/models/AuditLog';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('BulkDeleteOrdersAPI');

interface BulkDeleteRequest {
  orderIds: number[];
  permanent?: boolean;
}

/**
 * POST /api/orders/bulk-delete - Delete multiple orders at once
 * Using POST instead of DELETE to support request body
 */
export async function POST(request: NextRequest) {
  try {
    // Validate user authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = {
      id: (session.user as { dbUserId?: number }).dbUserId,
      email: session.user.email || undefined,
      name: session.user.name || undefined,
    };

    // Parse request body
    const body: BulkDeleteRequest = await request.json();
    const { orderIds, permanent = false } = body;

    // Validate request
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { message: 'orderIds must be a non-empty array of numbers' },
        { status: 400 }
      );
    }

    // Validate all IDs are numbers
    const invalidIds = orderIds.filter(id => typeof id !== 'number' || !Number.isInteger(id) || id <= 0);
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { message: 'All orderIds must be positive integers' },
        { status: 400 }
      );
    }

    let deletedCount: number;
    let deletedOrderIds: number[] = [];

    if (permanent) {
      // Permanent delete - actually remove from database
      const result = await executeWithRetry(async () => {
        const db = getDatabase();

        // First, delete order items (cascade should handle this, but being explicit)
        await db
          .delete(orderItems)
          .where(inArray(orderItems.orderId, orderIds));

        // Then delete the orders themselves
        const deleteResult = await db
          .delete(orders)
          .where(inArray(orders.id, orderIds))
          .returning({ id: orders.id });

        return deleteResult;
      }, { operationName: 'BulkDeleteOrdersPermanent' });

      deletedCount = result.length;
      deletedOrderIds = result.map((r: { id: number }) => r.id);
    } else {
      // Soft delete - set status to 'deleted'
      const result = await executeWithRetry(async () => {
        const db = getDatabase();

        const updateResult = await db
          .update(orders)
          .set({ status: 'deleted' })
          .where(inArray(orders.id, orderIds))
          .returning({ id: orders.id });

        return updateResult;
      }, { operationName: 'BulkDeleteOrdersSoft' });

      deletedCount = result.length;
      deletedOrderIds = result.map((r: { id: number }) => r.id);
    }

    // Log to audit_logs
    await AuditLog.create({
      entityType: 'order',
      entityId: 0, // Bulk operation - no single entity
      action: 'bulk_delete',
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      metadata: {
        orderIds,
        permanent,
        deletedCount,
        deletedOrderIds,
      },
    });

    logger.info('Bulk delete completed', {
      orderIds,
      permanent,
      deletedCount,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      deletedCount,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to bulk delete orders';
    logger.error('POST /api/orders/bulk-delete error', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}
