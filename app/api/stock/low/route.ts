import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Stock from '@/lib/models/Stock';
import { createLogger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const logger = createLogger('LowStockAPI');

/**
 * GET /api/stock/low - Get only low-stock items for alerts
 * Returns items where stockQuantity <= lowStockThreshold AND trackStock = true
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const items = await Stock.getLowStockItems();

    logger.debug('Low stock items retrieved', { count: items.length });

    return NextResponse.json({
      items,
      count: items.length,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch low stock items';
    logger.error('GET /api/stock/low error', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}
