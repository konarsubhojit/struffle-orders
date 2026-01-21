import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { and, gte, lte, eq } from 'drizzle-orm';
import { authOptions } from '@/lib/auth';
import { getDatabase } from '@/lib/db/connection';
import { orders, orderItems } from '@/lib/db/schema';
import { executeWithRetry } from '@/lib/utils/dbRetry';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('ProfitAnalyticsAPI');

export const dynamic = 'force-dynamic';

interface ItemProfitBreakdown {
  itemId: number;
  itemName: string;
  revenue: number;
  cost: number;
  profit: number;
  marginPercentage: number;
  quantitySold: number;
}

interface ProfitSummary {
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  profitMargin: number;
  itemBreakdown: ItemProfitBreakdown[];
  period: {
    startDate: string;
    endDate: string;
  };
}

/**
 * GET /api/analytics/profit - Get profit margin analytics
 * Query params:
 *   - startDate: ISO date string (required)
 *   - endDate: ISO date string (required)
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

    // Validate required parameters
    if (!startDateParam || !endDateParam) {
      return NextResponse.json(
        { message: 'startDate and endDate are required query parameters' },
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

    logger.info('Fetching profit analytics', { startDate: startDateParam, endDate: endDateParam });

    const result = await executeWithRetry(async () => {
      const db = getDatabase();

      // Get order items with costs for completed orders in the date range
      const orderItemsData = await db
        .select({
          itemId: orderItems.itemId,
          itemName: orderItems.name,
          price: orderItems.price,
          costPrice: orderItems.costPrice,
          quantity: orderItems.quantity,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(
          and(
            gte(orders.createdAt, startDate),
            lte(orders.createdAt, endDate),
            eq(orders.status, 'completed')
          )
        );

      // Calculate totals and per-item breakdown
      let totalRevenue = 0;
      let totalCost = 0;
      const itemMap = new Map<number, ItemProfitBreakdown>();

      for (const row of orderItemsData) {
        const revenue = Number(row.price) * row.quantity;
        // Use costPrice from order item if available, otherwise estimate as 0
        const cost = (Number(row.costPrice) || 0) * row.quantity;
        
        totalRevenue += revenue;
        totalCost += cost;

        const existing = itemMap.get(row.itemId);
        if (existing) {
          existing.revenue += revenue;
          existing.cost += cost;
          existing.profit += revenue - cost;
          existing.quantitySold += row.quantity;
        } else {
          itemMap.set(row.itemId, {
            itemId: row.itemId,
            itemName: row.itemName,
            revenue,
            cost,
            profit: revenue - cost,
            marginPercentage: 0, // Calculate after totals
            quantitySold: row.quantity,
          });
        }
      }

      // Calculate margin percentages
      const itemBreakdown: ItemProfitBreakdown[] = [];
      for (const item of itemMap.values()) {
        item.marginPercentage = item.revenue > 0 
          ? Math.round((item.profit / item.revenue) * 10000) / 100 
          : 0;
        itemBreakdown.push(item);
      }

      // Sort by revenue descending
      itemBreakdown.sort((a, b) => b.revenue - a.revenue);

      const grossProfit = totalRevenue - totalCost;
      const profitMargin = totalRevenue > 0 
        ? Math.round((grossProfit / totalRevenue) * 10000) / 100 
        : 0;

      return {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        grossProfit: Math.round(grossProfit * 100) / 100,
        profitMargin,
        itemBreakdown,
        period: {
          startDate: startDateParam,
          endDate: endDateParam,
        },
      } satisfies ProfitSummary;
    }, { operationName: 'ProfitAnalytics' });

    logger.info('Profit analytics fetched successfully', { 
      itemCount: result.itemBreakdown.length,
      totalRevenue: result.totalRevenue,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch profit analytics';
    logger.error('GET /api/analytics/profit error', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}
