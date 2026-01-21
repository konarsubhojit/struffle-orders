import { NextRequest, NextResponse } from 'next/server';
import Order from '@/lib/models/Order';
import { createLogger } from '@/lib/utils/logger';
import { calculateSalesAnalytics } from '@/lib/services/analyticsService';
import { getRedisClient, getRedisIfReady } from '@/lib/db/redisClient';

const logger = createLogger('AnalyticsAPI');

// Disable Next.js caching - use only Redis
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/analytics/sales - Get pre-computed sales analytics data
 * Query params:
 *   - statusFilter: 'completed' (default) or 'all'
 * Uses Redis caching with 24 hour TTL
 */
export async function GET(request: NextRequest) {
  try {
    // Try to use Redis cache
    const redis = getRedisIfReady() || await getRedisClient();
    
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('statusFilter') || 'completed';
    
    // Validate statusFilter
    if (statusFilter !== 'completed' && statusFilter !== 'all') {
      return NextResponse.json(
        { message: "Invalid statusFilter. Must be 'completed' or 'all'" },
        { status: 400 }
      );
    }

    logger.info('Fetching sales analytics', { statusFilter });
    
    // Generate cache key
    const cacheKey = redis ? `analytics:sales:${statusFilter}` : null;
    
    // Try cache if available
    if (cacheKey && redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        logger.debug('Cache hit', { key: cacheKey });
        return NextResponse.json(JSON.parse(cached), {
          headers: { 'X-Cache': 'HIT' }
        });
      }
    }

    // Fetch all orders
    const orders = await Order.find();
    
    // Calculate analytics using the service
    const analyticsData = calculateSalesAnalytics(orders, statusFilter);
    
    logger.info('Sales analytics response prepared', { 
      statusFilter,
      rangeCount: Object.keys(analyticsData.analytics).length 
    });
    
    // Cache the result
    if (cacheKey && redis) {
      await redis.setEx(cacheKey, 86400, JSON.stringify(analyticsData)); // 24 hour cache
    }

    return NextResponse.json(analyticsData, {
      headers: { 'X-Cache': 'MISS' }
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch analytics';
    const errorStatusCode = (error as { statusCode?: number }).statusCode || 500;
    logger.error('GET /api/analytics/sales error', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: errorStatusCode }
    );
  }
}
