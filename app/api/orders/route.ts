import { NextRequest, NextResponse } from 'next/server';
import Order from '@/lib/models/Order';
import Item from '@/lib/models/Item';
import { createLogger } from '@/lib/utils/logger';
import { invalidateOrderCache } from '@/lib/middleware/cache';
import { getRedisClient, getRedisIfReady } from '@/lib/db/redisClient';
import { getCacheVersion, CACHE_VERSION_KEYS } from '@/lib/middleware/cache';
import { PAGINATION } from '@/lib/constants/paginationConstants';

const logger = createLogger('OrdersAPI');

// Disable Next.js caching - use only Redis
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ALLOWED_LIMITS = new Set(PAGINATION.ALLOWED_LIMITS);

/**
 * Parse and validate cursor pagination parameters from query string
 */
function parseCursorParams(searchParams: URLSearchParams) {
  const parsedLimit = Number.parseInt(searchParams.get('limit') || '', 10);
  const cursorValue = searchParams.get('cursor');
  
  return {
    limit: ALLOWED_LIMITS.has(parsedLimit) ? parsedLimit : PAGINATION.DEFAULT_LIMIT,
    cursor: cursorValue || null
  };
}

function validateRequiredFields(orderFrom: unknown, customerName: unknown, customerId: unknown, items: unknown) {
  if (!orderFrom || !customerName || !customerId) {
    return { valid: false, error: 'Order source, customer name, and customer ID are required' };
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return { valid: false, error: 'At least one item is required' };
  }
  return { valid: true };
}

function validateDeliveryDate(expectedDeliveryDate: unknown): { valid: boolean; parsedDate?: Date | null; error?: string } {
  if (!expectedDeliveryDate) {
    return { valid: true, parsedDate: null };
  }
  
  const parsedDeliveryDate = new Date(expectedDeliveryDate as string | number | Date);
  if (Number.isNaN(parsedDeliveryDate.getTime())) {
    return { valid: false, error: 'Invalid expected delivery date' };
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deliveryDate = new Date(parsedDeliveryDate);
  deliveryDate.setHours(0, 0, 0, 0);
  
  if (deliveryDate < today) {
    return { valid: false, error: 'Expected delivery date cannot be in the past' };
  }
  
  return { valid: true, parsedDate: parsedDeliveryDate };
}

/**
 * GET /api/orders - List orders with cursor pagination
 * Uses Redis caching with version control for proper invalidation
 */
export async function GET(request: NextRequest) {
  try {
    // Try to use Redis cache
    const redis = getRedisIfReady() || await getRedisClient();
    
    const { searchParams } = new URL(request.url);
    const { limit, cursor } = parseCursorParams(searchParams);
    
    logger.debug('GET /api/orders request', { 
      hasCursorParam: !!searchParams.get('cursor'),
      hasLimitParam: searchParams.has('limit'),
      limitValue: searchParams.get('limit')
    });
    
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
    
    // Use cursor-based pagination for stable infinite scroll
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await Order.findCursorPaginated({ limit, cursor: cursor as any });
    
    logger.debug('Returning cursor-paginated orders', {
      orderCount: result.orders.length,
      hasMore: result.pagination.hasMore,
      nextCursor: result.pagination.nextCursor ? 'present' : 'null'
    });
    
    // Standardized response format: {items: [], pagination: {}}
    const response = {
      items: result.orders,
      pagination: result.pagination
    };
    
    // Cache the result
    if (cacheKey && redis && result.orders.length > 0) {
      await redis.setEx(cacheKey, 86400, JSON.stringify(response)); // 24 hour cache
    }
    
    return NextResponse.json(response, {
      headers: { 'X-Cache': 'MISS' }
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch orders';
    const errorStatusCode = (error as { statusCode?: number }).statusCode || 500;
    logger.error('GET /api/orders error', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: errorStatusCode }
    );
  }
}

/**
 * POST /api/orders - Create a new order
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      orderFrom,
      customerName,
      customerId,
      address,
      items,
      status,
      paymentStatus,
      paidAmount,
      confirmationStatus,
      customerNotes,
      priority,
      orderDate,
      expectedDeliveryDate,
      deliveryStatus,
      trackingId,
      deliveryPartner,
      actualDeliveryDate
    } = body;

    // Validate required fields
    const requiredValidation = validateRequiredFields(orderFrom, customerName, customerId, items);
    if (!requiredValidation.valid) {
      return NextResponse.json(
        { message: requiredValidation.error },
        { status: 400 }
      );
    }

    // Validate delivery date
    const deliveryDateValidation = validateDeliveryDate(expectedDeliveryDate);
    if (!deliveryDateValidation.valid) {
      return NextResponse.json(
        { message: deliveryDateValidation.error },
        { status: 400 }
      );
    }

    // Validate items structure
    const parsedItems = [];
    for (const item of items) {
      if (!item.itemId || item.quantity === undefined) {
        return NextResponse.json(
          { message: 'Each item must have itemId and quantity' },
          { status: 400 }
        );
      }

      const quantity = Number.parseInt(item.quantity, 10);
      if (Number.isNaN(quantity) || quantity <= 0) {
        return NextResponse.json(
          { message: 'Item quantity must be a positive integer' },
          { status: 400 }
        );
      }

      parsedItems.push({
        itemId: item.itemId,
        designId: item.designId,
        quantity: quantity,
        customizationRequest: item.customizationRequest
      });
    }

    // Fetch item details from database
    const itemIds = parsedItems.map(i => i.itemId);
    const itemsMap = await Item.findByIds(itemIds);
    
    // Validate items and calculate total
    let totalPrice = 0;
    const validatedItems = [];

    for (const parsedItem of parsedItems) {
      const item = itemsMap.get(Number.parseInt(parsedItem.itemId, 10));
      if (!item) {
        return NextResponse.json(
          { message: `Item with id ${parsedItem.itemId} not found` },
          { status: 400 }
        );
      }

      validatedItems.push({
        item: item._id,
        designId: parsedItem.designId || null,
        name: item.name,
        price: item.price,
        quantity: parsedItem.quantity,
        customizationRequest: parsedItem.customizationRequest?.trim() || ''
      });

      totalPrice += item.price * parsedItem.quantity;
    }

    const orderData: {
      orderFrom: string;
      customerName: string;
      customerId: string;
      address: string;
      totalPrice: number;
      items: Array<{
        item: number;
        name: string;
        price: number;
        quantity: number;
        customizationRequest: string;
      }>;
      status: string;
      paymentStatus: string;
      paidAmount: number;
      confirmationStatus: string;
      customerNotes: string;
      priority: number;
      orderDate: Date;
      expectedDeliveryDate: Date | null;
      deliveryStatus: string;
      trackingId: string;
      deliveryPartner: string;
      actualDeliveryDate: Date | null;
    } = {
      orderFrom,
      customerName: customerName.trim(),
      customerId: customerId.trim(),
      address: address?.trim() || '',
      totalPrice,
      items: validatedItems,
      status: status || 'pending',
      paymentStatus: paymentStatus || 'unpaid',
      paidAmount: paidAmount ? Number.parseFloat(paidAmount) : 0,
      confirmationStatus: confirmationStatus || 'unconfirmed',
      customerNotes: customerNotes || '',
      priority: priority !== undefined ? Number.parseInt(priority, 10) : 0,
      orderDate: orderDate ? new Date(orderDate) : new Date(),
      expectedDeliveryDate: deliveryDateValidation.parsedDate ?? null,
      deliveryStatus: deliveryStatus || 'not_shipped',
      trackingId: trackingId || '',
      deliveryPartner: deliveryPartner || '',
      actualDeliveryDate: actualDeliveryDate ? new Date(actualDeliveryDate) : null
    };

    const newOrder = await Order.create(orderData);
    
    // Invalidate order cache after creation
    await invalidateOrderCache();
    
    logger.info('Order created', { orderId: newOrder._id, orderIdStr: newOrder.orderId });
    
    return NextResponse.json(newOrder, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create order';
    const errorStatusCode = (error as { statusCode?: number }).statusCode || 500;
    logger.error('POST /api/orders error', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: errorStatusCode }
    );
  }
}
