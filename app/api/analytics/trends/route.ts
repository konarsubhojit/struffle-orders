import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { sql, and, gte, lte, eq } from 'drizzle-orm';
import { authOptions } from '@/lib/auth';
import { getDatabase } from '@/lib/db/connection';
import { orders } from '@/lib/db/schema';
import { executeWithRetry } from '@/lib/utils/dbRetry';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('TrendsAnalyticsAPI');

export const dynamic = 'force-dynamic';

type GroupBy = 'day' | 'week' | 'month';

interface TrendDataPoint {
  period: string;
  revenue: number;
  orderCount: number;
  averageOrderValue: number;
}

/**
 * GET /api/analytics/trends - Get sales trends over time
 * Query params:
 *   - startDate: ISO date string (required)
 *   - endDate: ISO date string (required)
 *   - groupBy: 'day' | 'week' | 'month' (default: 'day')
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
    const groupBy = (searchParams.get('groupBy') || 'day') as GroupBy;

    // Validate required parameters
    if (!startDateParam || !endDateParam) {
      return NextResponse.json(
        { message: 'startDate and endDate are required query parameters' },
        { status: 400 }
      );
    }

    // Validate groupBy parameter
    if (!['day', 'week', 'month'].includes(groupBy)) {
      return NextResponse.json(
        { message: "groupBy must be 'day', 'week', or 'month'" },
        { status: 400 }
      );
    }

    const startDate = new Date(startDateParam);
    const endDate = new Date(endDateParam);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return NextResponse.json(
        { message: 'Invalid date format. Use ISO date strings.' },
        { status: 400 }
      );
    }

    logger.info('Fetching sales trends', { startDate: startDateParam, endDate: endDateParam, groupBy });

    const result = await executeWithRetry(async () => {
      const db = getDatabase();

      // Build date truncation based on groupBy
      let dateTrunc: ReturnType<typeof sql>;
      switch (groupBy) {
        case 'week':
          dateTrunc = sql`date_trunc('week', ${orders.createdAt})`;
          break;
        case 'month':
          dateTrunc = sql`date_trunc('month', ${orders.createdAt})`;
          break;
        case 'day':
        default:
          dateTrunc = sql`date_trunc('day', ${orders.createdAt})`;
          break;
      }

      // Query aggregated data grouped by period
      const trendsData = await db
        .select({
          period: dateTrunc.as('period'),
          revenue: sql<string>`COALESCE(SUM(${orders.totalPrice}::numeric), 0)`.as('revenue'),
          orderCount: sql<number>`COUNT(*)`.as('order_count'),
        })
        .from(orders)
        .where(
          and(
            gte(orders.createdAt, startDate),
            lte(orders.createdAt, endDate),
            eq(orders.status, 'completed')
          )
        )
        .groupBy(dateTrunc)
        .orderBy(dateTrunc);

      // Transform data to response format
      const trends: TrendDataPoint[] = trendsData.map((row: { period: unknown; revenue: string; orderCount: number }) => {
        const revenue = Number(row.revenue);
        const orderCount = Number(row.orderCount);
        const averageOrderValue = orderCount > 0 
          ? Math.round((revenue / orderCount) * 100) / 100 
          : 0;

        // Format period string based on groupBy
        const periodDate = new Date(row.period as string);
        let periodStr: string;
        
        switch (groupBy) {
          case 'week':
            // ISO week format: YYYY-Www
            { const weekNum = getISOWeek(periodDate);
            periodStr = `${periodDate.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
            break; }
          case 'month':
            periodStr = `${periodDate.getFullYear()}-${(periodDate.getMonth() + 1).toString().padStart(2, '0')}`;
            break;
          case 'day':
          default:
            periodStr = periodDate.toISOString().split('T')[0];
            break;
        }

        return {
          period: periodStr,
          revenue: Math.round(revenue * 100) / 100,
          orderCount,
          averageOrderValue,
        };
      });

      return trends;
    }, { operationName: 'TrendsAnalytics' });

    logger.info('Sales trends fetched successfully', { dataPoints: result.length });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch sales trends';
    logger.error('GET /api/analytics/trends error', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Get ISO week number for a date
 */
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
