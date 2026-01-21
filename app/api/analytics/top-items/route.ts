import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { sql, and, gte, lte, eq, desc } from 'drizzle-orm';
import { authOptions } from '@/lib/auth';
import { getDatabase } from '@/lib/db/connection';
import { orders, orderItems } from '@/lib/db/schema';
import { executeWithRetry } from '@/lib/utils/dbRetry';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('TopItemsAnalyticsAPI');

export const dynamic = 'force-dynamic';

interface TopItem {
  itemId: number;
  itemName: string;
  totalQuantity: number;
  totalRevenue: number;
  orderCount: number;
}

/**
 * GET /api/analytics/top-items - Get top selling items
 * Query params:
 *   - startDate: ISO date string (optional)
 *   - endDate: ISO date string (optional)
 *   - limit: number (default: 10)
 */
export async function GET(request: NextRequest) {
  try {
    // Validate user authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const limitParam = searchParams.get('limit');
    const limit = Math.min(Math.max(1, Number.parseInt(limitParam || '10', 10)), 100);

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (startDateParam) {
      startDate = new Date(startDateParam);
      if (Number.isNaN(startDate.getTime())) {
        return NextResponse.json(
          { message: 'Invalid startDate format. Use ISO date strings.' },
          { status: 400 }
        );
      }
    }

    if (endDateParam) {
      endDate = new Date(endDateParam);
      if (Number.isNaN(endDate.getTime())) {
        return NextResponse.json(
          { message: 'Invalid endDate format. Use ISO date strings.' },
          { status: 400 }
        );
      }
    }

    logger.info('Fetching top items', { startDate: startDateParam, endDate: endDateParam, limit });

    const result = await executeWithRetry(async () => {
      const db = getDatabase();

      // Build where conditions
      const conditions = [eq(orders.status, 'completed')];
      if (startDate) {
        conditions.push(gte(orders.createdAt, startDate));
      }
      if (endDate) {
        conditions.push(lte(orders.createdAt, endDate));
      }

      // Query top items by quantity and revenue
      const topItemsData = await db
        .select({
          itemId: orderItems.itemId,
          itemName: orderItems.name,
          totalQuantity: sql<number>`SUM(${orderItems.quantity})`.as('total_quantity'),
          totalRevenue: sql<string>`SUM(${orderItems.price}::numeric * ${orderItems.quantity})`.as('total_revenue'),
          orderCount: sql<number>`COUNT(DISTINCT ${orders.id})`.as('order_count'),
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(and(...conditions))
        .groupBy(orderItems.itemId, orderItems.name)
        .orderBy(desc(sql`total_quantity`))
        .limit(limit);

      // Transform data to response format
      const topItems: TopItem[] = topItemsData.map((row: { itemId: number; itemName: string; totalQuantity: number; totalRevenue: string; orderCount: number }) => ({
        itemId: row.itemId,
        itemName: row.itemName,
        totalQuantity: Number(row.totalQuantity),
        totalRevenue: Math.round(Number(row.totalRevenue) * 100) / 100,
        orderCount: Number(row.orderCount),
      }));

      return topItems;
    }, { operationName: 'TopItemsAnalytics' });

    logger.info('Top items fetched successfully', { count: result.length });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch top items';
    logger.error('GET /api/analytics/top-items error', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}
