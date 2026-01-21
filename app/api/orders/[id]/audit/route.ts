import { NextRequest, NextResponse } from 'next/server';
import AuditLog from '@/lib/models/AuditLog';
import Order from '@/lib/models/Order';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('OrderAuditAPI');

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/orders/[id]/audit - Get audit trail for an order
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const numericId = Number.parseInt(id, 10);
    
    if (Number.isNaN(numericId)) {
      return NextResponse.json(
        { message: 'Invalid order ID' },
        { status: 400 }
      );
    }

    // Verify order exists
    const order = await Order.findById(numericId);
    if (!order) {
      return NextResponse.json(
        { message: 'Order not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Number.parseInt(searchParams.get('limit') || '100', 10);
    const offset = Number.parseInt(searchParams.get('offset') || '0', 10);

    const auditTrail = await AuditLog.getOrderAuditTrail(numericId, {
      limit: Math.min(limit, 500),
      offset,
    });

    return NextResponse.json({
      orderId: order.orderId,
      items: auditTrail,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch order audit trail';
    logger.error('GET /api/orders/[id]/audit error', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}
