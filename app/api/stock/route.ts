import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Stock from '@/lib/models/Stock';
import { createLogger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const logger = createLogger('StockAPI');

/**
 * GET /api/stock - Get all items with stock info (for inventory view)
 * Query params:
 *   - lowStockOnly: 'true' to filter only low stock items
 *   - page: page number (default: 1)
 *   - limit: items per page (default: 20, max: 100)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const lowStockOnly = searchParams.get('lowStockOnly') === 'true';
    const page = Number.parseInt(searchParams.get('page') || '1', 10);
    const limit = Number.parseInt(searchParams.get('limit') || '20', 10);

    // Validate pagination params
    const validPage = Number.isNaN(page) || page < 1 ? 1 : page;
    const validLimit = Number.isNaN(limit) || limit < 1 || limit > 100 ? 20 : limit;

    const result = await Stock.getAllItemsWithStock({
      lowStockOnly,
      page: validPage,
      limit: validLimit,
    });

    logger.debug('Stock items retrieved', {
      count: result.items.length,
      page: result.pagination.page,
      total: result.pagination.total,
      lowStockOnly,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch stock items';
    logger.error('GET /api/stock error', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}
