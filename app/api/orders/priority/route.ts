import { NextRequest, NextResponse } from 'next/server';
import Order from '@/lib/models/Order';
import { createLogger } from '@/lib/utils/logger';
import { getRedisClient, getRedisIfReady } from '@/lib/db/redisClient';
import { getCacheVersion, CACHE_VERSION_KEYS } from '@/lib/middleware/cache';

const logger = createLogger('PriorityOrdersAPI');

// Disable Next.js caching - use only Redis
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/orders/priority - Get priority orders based on delivery dates
 * Uses Redis caching with 24 hour TTL
 */
export async function GET(request: NextRequest) {
  try {
    // Try to use Redis cache
    const redis = getRedisIfReady() || await getRedisClient();
    
    logger.debug('GET /api/orders/priority request');
    
    // Generate cache key
    const cacheKey = redis ? 
      `v${await getCacheVersion(redis, CACHE_VERSION_KEYS.ORDERS)}:GET:${request.url}` : 
      null;
    
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
    
    const orders = await Order.findPriorityOrders();
    
    // Ensure we always return an array (defensive programming)
    const ordersArray = Array.isArray(orders) ? orders : [];
    
    logger.debug('Returning priority orders', {
      orderCount: ordersArray.length
    });
    
    // Cache the result
    if (cacheKey && redis && ordersArray.length > 0) {
      await redis.setEx(cacheKey, 86400, JSON.stringify(ordersArray)); // 24 hour cache
    }
    
    return NextResponse.json(ordersArray, {
      headers: { 'X-Cache': 'MISS' }
    });
  } catch (error: unknown) {
    logger.error('GET /api/orders/priority error', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to fetch priority orders' },
      { status: (error as { statusCode?: number }).statusCode || 500 }
    );
  }
}
