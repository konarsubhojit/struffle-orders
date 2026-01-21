import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import Item from '@/lib/models/Item';
import { createLogger } from '@/lib/utils/logger';
import { parsePaginationParams } from '@/lib/utils/pagination';
import { invalidateItemCache } from '@/lib/middleware/cache';
import { getRedisClient, getRedisIfReady } from '@/lib/db/redisClient';
import { getCacheVersion, CACHE_VERSION_KEYS } from '@/lib/middleware/cache';
import { IMAGE_CONFIG } from '@/lib/constants/imageConstants';

const logger = createLogger('ItemsAPI');

// Disable Next.js caching - use only Redis
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function uploadImage(image: string) {
  const matches = image.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid image format');
  }
  
  const extension = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, 'base64');
  
  if (buffer.length > IMAGE_CONFIG.MAX_SIZE) {
    throw new Error(`Image size should be less than ${IMAGE_CONFIG.MAX_SIZE_MB}MB`);
  }
  
  const filename = `items/${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
  const blob = await put(filename, buffer, { 
    access: 'public',
    contentType: `image/${extension}`
  });
  
  return blob.url;
}

/**
 * GET /api/items - Get all items with cursor or offset pagination
 * Uses Redis caching with version control for proper invalidation
 * Supports both cursor-based (recommended) and offset-based pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Try to use Redis cache
    const redis = getRedisIfReady() || await getRedisClient();
    
    const { searchParams } = new URL(request.url);
    const cursorParam = searchParams.get('cursor');
    const hasCursor = cursorParam !== null;
    
    const query = {
      page: searchParams.get('page') || '',
      limit: searchParams.get('limit') || '',
      search: searchParams.get('search') || ''
    };
    const { page, limit, search } = parsePaginationParams(query);
    
    logger.debug('GET /api/items request', { 
      paginationType: hasCursor ? 'cursor' : 'offset',
      page,
      limit,
      cursor: hasCursor ? 'present' : 'none',
      hasSearchParam: !!search,
      searchLength: search.length
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
      result = await (Item.findCursor as any)({ 
        limit, 
        cursor: cursorParam, 
        search 
      }) as { items: unknown[]; pagination: { limit: number; nextCursor: string | null; hasMore: boolean } };
    } else {
      result = await Item.findPaginated({ page, limit, search });
    }
    
    logger.debug('Returning paginated items', { 
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
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch items';
    const errorStatusCode = (error as { statusCode?: number }).statusCode || 500;
    logger.error('GET /api/items error', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: errorStatusCode }
    );
  }
}

/**
 * POST /api/items - Create a new item
 */
export async function POST(request: NextRequest) {
  try {
    // Check Content-Type to determine if it's FormData or JSON
    const contentType = request.headers.get('content-type') || '';
    let name: string;
    let price: string | number;
    let color: string | undefined;
    let fabric: string | undefined;
    let specialFeatures: string | undefined;
    let image: string | undefined;

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData
      const formData = await request.formData();
      // For required fields, let null/empty values be caught by validation later
      name = (formData.get('name') as string | null) ?? '';
      price = (formData.get('price') as string | null) ?? '';
      // For optional fields, convert null to undefined
      color = (formData.get('color') as string | null) || undefined;
      fabric = (formData.get('fabric') as string | null) || undefined;
      specialFeatures = (formData.get('specialFeatures') as string | null) || undefined;
      image = (formData.get('image') as string | null) || undefined;
    } else {
      // Handle JSON
      const body = await request.json();
      ({ name, price, color, fabric, specialFeatures, image } = body);
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { message: 'Item name is required' },
        { status: 400 }
      );
    }

    const parsedPrice = Number.parseFloat(String(price));
    if (price === undefined || price === null || Number.isNaN(parsedPrice) || parsedPrice < 0) {
      return NextResponse.json(
        { message: 'Valid price is required' },
        { status: 400 }
      );
    }

    let imageUrl = '';
    
    if (image && typeof image === 'string' && image.startsWith('data:image/')) {
      try {
        imageUrl = await uploadImage(image);
        logger.info('Image uploaded to blob storage', { url: imageUrl });
      } catch (uploadError: unknown) {
        const uploadErrorMessage = uploadError instanceof Error ? uploadError.message : 'Image upload failed';
        logger.error('Image upload failed', uploadError);
        return NextResponse.json(
          { message: uploadErrorMessage },
          { status: 400 }
        );
      }
    }

    const item = await Item.create({
      name: name.trim(),
      price: parsedPrice,
      color: color?.trim() || '',
      fabric: fabric?.trim() || '',
      specialFeatures: specialFeatures?.trim() || '',
      imageUrl
    });

    // Invalidate item cache after creation
    await invalidateItemCache();

    logger.info('Item created', { itemId: item.id });
    
    return NextResponse.json(item, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create item';
    const errorStatusCode = (error as { statusCode?: number }).statusCode || 500;
    logger.error('POST /api/items error', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: errorStatusCode }
    );
  }
}
