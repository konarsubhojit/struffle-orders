import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import Item from '@/lib/models/Item';
import { createLogger } from '@/lib/utils/logger';
import { parsePaginationParams } from '@/lib/utils/pagination';
import { getRedisClient, getRedisIfReady } from '@/lib/db/redisClient';
import { getCacheVersion, CACHE_VERSION_KEYS } from '@/lib/middleware/cache';

const logger = createLogger('ItemsDeletedAPI');

// Disable Next.js caching - use only Redis
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/items/deleted - Get soft-deleted items with cursor or offset pagination
 * Uses Redis caching with version control for proper invalidation
 * Supports both cursor-based (recommended) and offset-based pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Try to use Redis cache
    const redis = getRedisIfReady() || await getRedisClient();
    
    const { searchParams } = new URL(request.url);
    
    // Check if cursor-based pagination is requested
    const cursorParam = searchParams.get('cursor');
    const hasCursor = cursorParam !== null;
    
    // Convert URLSearchParams to object for parsePaginationParams
    const query = {
      page: searchParams.get('page') || '',
      limit: searchParams.get('limit') || '',
      search: searchParams.get('search') || ''
    };
    const { page, limit, search } = parsePaginationParams(query);
    
    logger.debug('GET /api/items/deleted request', { 
      paginationType: hasCursor ? 'cursor' : 'offset',
      page,
      limit,
      cursor: hasCursor ? 'present' : 'none',
      hasSearchParam: !!search
    });
    
    // Generate cache key
    const cacheKey = redis ? 
      `v${await getCacheVersion(redis, CACHE_VERSION_KEYS.ITEMS)}:GET:${request.url}` : 
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
    
    let result;
    
    if (cursorParam) {
      // Use cursor-based pagination (recommended for scalability)
      // Cast to any to bypass TypeScript's strict parameter checking for JS model
      result = await (Item.findDeletedCursor as any)({ 
        limit, 
        cursor: cursorParam, 
        search 
      }) as { items: unknown[]; pagination: { limit: number; nextCursor: string | null; hasMore: boolean } };
    } else {
      // Use offset-based pagination (legacy, backward compatible)
      result = await Item.findDeletedPaginated({ page, limit, search });
    }
    
    logger.debug('Returning paginated deleted items', {
      itemCount: result.items.length,
      paginationType: hasCursor ? 'cursor' : 'offset',
      ...(hasCursor ? {
        hasMore: result.pagination.hasMore,
        nextCursor: result.pagination.nextCursor ? 'present' : 'null'
      } : {
        page: result.pagination.page,
        total: result.pagination.total
      })
    });
    
    // Cache the result
    if (cacheKey && redis && result.items.length > 0) {
      await redis.setEx(cacheKey, 86400, JSON.stringify(result)); // 24 hour cache
    }
    
    return NextResponse.json(result, {
      headers: { 'X-Cache': 'MISS' }
    });
  } catch (error: unknown) {
    logger.error('GET /api/items/deleted error', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to fetch deleted items' },
      { status: (error as { statusCode?: number }).statusCode || 500 }
    );
  }
}
