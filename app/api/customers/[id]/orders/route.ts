import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Customer from '@/lib/models/Customer';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('CustomerOrdersAPI');

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/customers/[id]/orders - Get customer's order history
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const numericId = Number.parseInt(id, 10);

    if (Number.isNaN(numericId)) {
      return NextResponse.json(
        { message: 'Invalid customer ID' },
        { status: 400 }
      );
    }

    // Check if customer exists
    const customer = await Customer.findById(numericId);
    if (!customer) {
      return NextResponse.json(
        { message: 'Customer not found' },
        { status: 404 }
      );
    }

    const orders = await Customer.getOrderHistory(numericId);

    logger.debug('Customer order history retrieved', {
      customerId: numericId,
      businessId: customer.customerId,
      orderCount: orders.length,
    });

    return NextResponse.json({
      customer: {
        id: customer.id,
        customerId: customer.customerId,
        name: customer.name,
      },
      items: orders,
      total: orders.length,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch customer orders';
    logger.error('GET /api/customers/[id]/orders error', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}
