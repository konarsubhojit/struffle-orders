import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { sql, and, gte, lte, eq, desc } from 'drizzle-orm';
import { authOptions } from '@/lib/auth';
import { getDatabase } from '@/lib/db/connection';
import { orders } from '@/lib/db/schema';
import { executeWithRetry } from '@/lib/utils/dbRetry';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('TopCustomersAnalyticsAPI');

export const dynamic = 'force-dynamic';

interface TopCustomer {
  customerName: string;
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
}

/**
 * GET /api/analytics/top-customers - Get top customers by spending
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

    logger.info('Fetching top customers', { startDate: startDateParam, endDate: endDateParam, limit });

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

      // Query top customers by total spent
      const topCustomersData = await db
        .select({
          customerName: orders.customerName,
          totalOrders: sql<number>`COUNT(*)`.as('total_orders'),
          totalSpent: sql<string>`SUM(${orders.totalPrice}::numeric)`.as('total_spent'),
        })
        .from(orders)
        .where(and(...conditions))
        .groupBy(orders.customerName)
        .orderBy(desc(sql`total_spent`))
        .limit(limit);

      // Transform data to response format
      const topCustomers: TopCustomer[] = topCustomersData.map((row: { customerName: string; totalOrders: number; totalSpent: string }) => {
        const totalOrders = Number(row.totalOrders);
        const totalSpent = Number(row.totalSpent);
        const averageOrderValue = totalOrders > 0 
          ? Math.round((totalSpent / totalOrders) * 100) / 100 
          : 0;

        return {
          customerName: row.customerName,
          totalOrders,
          totalSpent: Math.round(totalSpent * 100) / 100,
          averageOrderValue,
        };
      });

      return topCustomers;
    }, { operationName: 'TopCustomersAnalytics' });

    logger.info('Top customers fetched successfully', { count: result.length });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch top customers';
    logger.error('GET /api/analytics/top-customers error', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}
