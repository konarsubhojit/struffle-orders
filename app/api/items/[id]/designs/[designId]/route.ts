import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import ItemDesign from '@/lib/models/ItemDesign';
import { createLogger } from '@/lib/utils/logger';
import { invalidateItemCache } from '@/lib/middleware/cache';

// Disable Next.js caching - use only Redis
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const logger = createLogger('ItemDesignAPI');

/**
 * DELETE /api/items/[id]/designs/[designId] - Delete a design
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; designId: string }> }
) {
  try {
    const { designId } = await params;
    const numericDesignId = parseInt(designId, 10);
    
    if (isNaN(numericDesignId)) {
      return NextResponse.json(
        { message: 'Invalid design ID' },
        { status: 400 }
      );
    }
    
    const deletedDesign = await ItemDesign.delete(numericDesignId);
    
    if (!deletedDesign) {
      return NextResponse.json(
        { message: 'Design not found' },
        { status: 404 }
      );
    }
    
    // Try to delete the image from blob storage
    if (deletedDesign.imageUrl) {
      try {
        await del(deletedDesign.imageUrl);
        logger.info('Design image deleted from blob', { url: deletedDesign.imageUrl });
      } catch (deleteError) {
        logger.warn('Failed to delete design image from blob', deleteError);
        // Continue even if blob deletion fails
      }
    }
    
    // Invalidate item cache after design deletion
    await invalidateItemCache();
    
    logger.info('Design deleted', { designId: numericDesignId });
    
    return NextResponse.json({ message: 'Design deleted successfully' });
  } catch (error: unknown) {
    logger.error('DELETE /api/items/:id/designs/:designId error', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to delete design' },
      { status: (error as { statusCode?: number }).statusCode || 500 }
    );
  }
}

/**
 * PUT /api/items/[id]/designs/[designId] - Update a design
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; designId: string }> }
) {
  try {
    const { id, designId } = await params;
    const itemId = parseInt(id, 10);
    const numericDesignId = parseInt(designId, 10);
    
    if (isNaN(itemId) || isNaN(numericDesignId)) {
      return NextResponse.json(
        { message: 'Invalid item ID or design ID' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { isPrimary, displayOrder } = body;
    
    // Handle setting primary design
    if (isPrimary !== undefined && isPrimary) {
      const updated = await ItemDesign.updatePrimary(itemId, numericDesignId);
      if (!updated) {
        return NextResponse.json(
          { message: 'Design not found' },
          { status: 404 }
        );
      }
      
      // Invalidate item cache after design update
      await invalidateItemCache();
      
      logger.info('Design set as primary', { designId: numericDesignId, itemId });
      return NextResponse.json(updated);
    }
    
    // Handle updating display order
    if (displayOrder !== undefined) {
      const updated = await ItemDesign.updateDisplayOrder(numericDesignId, displayOrder);
      if (!updated) {
        return NextResponse.json(
          { message: 'Design not found' },
          { status: 404 }
        );
      }
      
      // Invalidate item cache after design update
      await invalidateItemCache();
      
      logger.info('Design display order updated', { designId: numericDesignId, displayOrder });
      return NextResponse.json(updated);
    }
    
    return NextResponse.json(
      { message: 'No valid update fields provided' },
      { status: 400 }
    );
  } catch (error: unknown) {
    logger.error('PUT /api/items/:id/designs/:designId error', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to update design' },
      { status: (error as { statusCode?: number }).statusCode || 500 }
    );
  }
}
