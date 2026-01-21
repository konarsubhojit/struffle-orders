import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Stock from '@/lib/models/Stock';
import { createLogger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const logger = createLogger('ItemStockAPI');

/**
 * GET /api/items/[id]/stock - Get stock info for a specific item
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
        { message: 'Invalid item ID' },
        { status: 400 }
      );
    }

    const stockInfo = await Stock.getItemStock(numericId);

    if (!stockInfo) {
      return NextResponse.json(
        { message: 'Item not found' },
        { status: 404 }
      );
    }

    logger.debug('Stock info retrieved', { itemId: id });

    return NextResponse.json(stockInfo);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch stock info';
    logger.error('GET /api/items/[id]/stock error', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/items/[id]/stock - Manual stock adjustment
 * Body: { quantity: number, notes?: string }
 * 
 * Positive quantity = add stock (restock)
 * Negative quantity = remove stock (adjustment)
 */
export async function POST(
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
        { message: 'Invalid item ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { quantity, notes } = body;

    if (typeof quantity !== 'number' || Number.isNaN(quantity)) {
      return NextResponse.json(
        { message: 'Quantity must be a valid number' },
        { status: 400 }
      );
    }

    if (quantity === 0) {
      return NextResponse.json(
        { message: 'Quantity cannot be zero' },
        { status: 400 }
      );
    }

    // Determine transaction type based on quantity
    const transactionType = quantity > 0 ? 'restock' : 'adjustment';

    const transaction = await Stock.adjustStock(
      numericId,
      quantity,
      transactionType,
      notes,
      session.user.dbUserId,
      session.user.email || undefined
    );

    logger.info('Stock adjusted', {
      itemId: id,
      quantity,
      transactionType,
      userId: session.user.dbUserId,
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to adjust stock';

    // Handle specific error cases
    if (errorMessage.includes('Item not found')) {
      return NextResponse.json({ message: errorMessage }, { status: 404 });
    }
    if (errorMessage.includes('Insufficient stock')) {
      return NextResponse.json({ message: errorMessage }, { status: 400 });
    }

    logger.error('POST /api/items/[id]/stock error', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}
