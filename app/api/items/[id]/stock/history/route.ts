import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Stock from '@/lib/models/Stock';
import { createLogger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const logger = createLogger('StockHistoryAPI');

/**
 * GET /api/items/[id]/stock/history - Get transaction history for an item
 * Query params:
 *   - page: page number (default: 1)
 *   - limit: items per page (default: 20, max: 100)
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

    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get('page') || '1', 10);
    const limit = Number.parseInt(searchParams.get('limit') || '20', 10);

    // Validate pagination params
    const validPage = Number.isNaN(page) || page < 1 ? 1 : page;
    const validLimit = Number.isNaN(limit) || limit < 1 || limit > 100 ? 20 : limit;

    const result = await Stock.getTransactionHistory(numericId, {
      page: validPage,
      limit: validLimit,
    });

    logger.debug('Stock transaction history retrieved', {
      itemId: id,
      count: result.transactions.length,
      page: result.pagination.page,
      total: result.pagination.total,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch stock history';

    if (errorMessage.includes('Invalid item ID')) {
      return NextResponse.json({ message: errorMessage }, { status: 400 });
    }

    logger.error('GET /api/items/[id]/stock/history error', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}
