import { NextRequest, NextResponse } from 'next/server';
import Item from '@/lib/models/Item';
import { createLogger } from '@/lib/utils/logger';
import { invalidateItemCache } from '@/lib/middleware/cache';

// Disable Next.js caching - use only Redis
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const logger = createLogger('ItemRestoreAPI');

/**
 * POST /api/items/[id]/restore - Restore a soft-deleted item
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await Item.restore(id);
    if (!item) {
      return NextResponse.json(
        { message: 'Item not found' },
        { status: 404 }
      );
    }
    
    // Invalidate item cache after restoration
    await invalidateItemCache();
    
    logger.info('Item restored', { itemId: id });
    
    return NextResponse.json(item);
  } catch (error: unknown) {
    logger.error('POST /api/items/[id]/restore error', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to restore item' },
      { status: (error as { statusCode?: number }).statusCode || 500 }
    );
  }
}
