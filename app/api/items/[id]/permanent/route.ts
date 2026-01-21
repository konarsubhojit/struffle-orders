import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import Item from '@/lib/models/Item';
import { createLogger } from '@/lib/utils/logger';
import { invalidateItemCache } from '@/lib/middleware/cache';

// Disable Next.js caching - use only Redis
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const logger = createLogger('ItemPermanentAPI');

/**
 * DELETE /api/items/[id]/permanent - Permanently remove image from soft-deleted item
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await Item.findById(id);
    if (!item) {
      return NextResponse.json(
        { message: 'Item not found' },
        { status: 404 }
      );
    }

    // Check if item is soft deleted
    if (!item.deletedAt) {
      return NextResponse.json(
        { message: 'Item must be soft-deleted before permanent image removal' },
        { status: 400 }
      );
    }

    const imageUrl = item.imageUrl;

    // Remove image from blob storage if it exists
    if (imageUrl) {
      try {
        await del(imageUrl);
        logger.info('Image deleted from blob storage', { url: imageUrl });
      } catch (deleteError: any) {
        logger.warn('Failed to delete image from blob storage', { url: imageUrl, error: deleteError.message });
      }
    }

    // Clear the imageUrl from the item record (keep the item for historical orders)
    await Item.permanentlyRemoveImage(id);
    
    // Invalidate item cache after permanent removal
    await invalidateItemCache();
    
    logger.info('Item image permanently removed', { itemId: id });
    
    return NextResponse.json({ message: 'Item image permanently removed' });
  } catch (error: unknown) {
    logger.error('DELETE /api/items/[id]/permanent error', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to permanently remove item image' },
      { status: (error as { statusCode?: number }).statusCode || 500 }
    );
  }
}
