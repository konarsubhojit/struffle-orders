import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { eq, inArray } from 'drizzle-orm';
import { authOptions } from '@/lib/auth';
import { getDatabase } from '@/lib/db/connection';
import { orders } from '@/lib/db/schema';
import { executeWithRetry } from '@/lib/utils/dbRetry';
import AuditLog from '@/lib/models/AuditLog';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('BulkUpdateOrdersAPI');

// Allowed fields for bulk update
const ALLOWED_STATUS_VALUES = ['pending', 'processing', 'completed', 'cancelled', 'deleted'];
const ALLOWED_PAYMENT_STATUS_VALUES = ['unpaid', 'partially_paid', 'paid', 'cash_on_delivery', 'refunded'];

interface BulkUpdateRequest {
  orderIds: number[];
  updates: {
    status?: string;
    paymentStatus?: string;
  };
}

/**
 * POST /api/orders/bulk-update - Update multiple orders at once
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
    const body: BulkUpdateRequest = await request.json();
    const { orderIds, updates } = body;

    // Validate request
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { message: 'orderIds must be a non-empty array of numbers' },
        { status: 400 }
      );
    }

    if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
      return NextResponse.json(
        { message: 'updates must be a non-empty object with status and/or paymentStatus' },
        { status: 400 }
      );
    }

    // Validate update values
    if (updates.status !== undefined && !ALLOWED_STATUS_VALUES.includes(updates.status)) {
      return NextResponse.json(
        { message: `Invalid status value. Allowed: ${ALLOWED_STATUS_VALUES.join(', ')}` },
        { status: 400 }
      );
    }

    if (updates.paymentStatus !== undefined && !ALLOWED_PAYMENT_STATUS_VALUES.includes(updates.paymentStatus)) {
      return NextResponse.json(
        { message: `Invalid paymentStatus value. Allowed: ${ALLOWED_PAYMENT_STATUS_VALUES.join(', ')}` },
        { status: 400 }
      );
    }

    // Perform bulk update in a transaction
    const result = await executeWithRetry(async () => {
      const db = getDatabase();

      // Build update object with only provided fields
      const updateData: Record<string, string> = {};
      if (updates.status !== undefined) {
        updateData.status = updates.status;
      }
      if (updates.paymentStatus !== undefined) {
        updateData.paymentStatus = updates.paymentStatus;
      }

      // Execute the bulk update
      const updateResult = await db
        .update(orders)
        .set(updateData)
        .where(inArray(orders.id, orderIds))
        .returning({ id: orders.id });

      return updateResult;
    }, { operationName: 'BulkUpdateOrders' });

    const updatedCount = result.length;

    // Log to audit_logs
    await AuditLog.create({
      entityType: 'order',
      entityId: 0, // Bulk operation - no single entity
      action: 'bulk_update',
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      newData: updates,
      metadata: {
        orderIds,
        updatedCount,
        updatedOrderIds: result.map((r: { id: number }) => r.id),
      },
    });

    logger.info('Bulk update completed', {
      orderIds,
      updates,
      updatedCount,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      updatedCount,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to bulk update orders';
    logger.error('POST /api/orders/bulk-update error', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}
