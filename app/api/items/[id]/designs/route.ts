import { NextRequest, NextResponse } from 'next/server';
import ItemDesign from '@/lib/models/ItemDesign';
import { createLogger } from '@/lib/utils/logger';
import { invalidateItemCache } from '@/lib/middleware/cache';
import { uploadDataImage } from '@/lib/storage/images';

// Disable Next.js caching - use only Redis
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const logger = createLogger('ItemDesignsAPI');

/**
 * GET /api/items/[id]/designs - Get all designs for an item
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const itemId = parseInt(id, 10);
    
    if (isNaN(itemId)) {
      return NextResponse.json(
        { message: 'Invalid item ID' },
        { status: 400 }
      );
    }
    
    const designs = await ItemDesign.findByItemId(itemId);
    
    return NextResponse.json(designs);
  } catch (error: unknown) {
    logger.error('GET /api/items/:id/designs error', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to fetch designs' },
      { status: (error as { statusCode?: number }).statusCode || 500 }
    );
  }
}

/**
 * POST /api/items/[id]/designs - Add a new design to an item
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const itemId = parseInt(id, 10);
    
    if (isNaN(itemId)) {
      return NextResponse.json(
        { message: 'Invalid item ID' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { designName, image, isPrimary, displayOrder } = body;
    
    if (!designName || typeof designName !== 'string' || !designName.trim()) {
      return NextResponse.json(
        { message: 'Design name is required' },
        { status: 400 }
      );
    }
    
    if (!image || typeof image !== 'string' || !image.startsWith('data:image/')) {
      return NextResponse.json(
        { message: 'Valid image is required' },
        { status: 400 }
      );
    }
    
    let imageUrl = '';
    try {
      imageUrl = await uploadDataImage(image, `items/${itemId}/designs`);
      logger.info('Design image uploaded', { itemId, url: imageUrl });
    } catch (uploadError: any) {
      logger.error('Design image upload failed', uploadError);
      return NextResponse.json(
        { message: uploadError.message },
        { status: 400 }
      );
    }
    
    const design = await ItemDesign.create({
      itemId,
      designName: designName.trim(),
      imageUrl,
      isPrimary: isPrimary || false,
      displayOrder: displayOrder || 0
    });
    
    // Invalidate item cache after design creation
    await invalidateItemCache();
    
    logger.info('Design created', { designId: design.id, itemId });
    
    return NextResponse.json(design, { status: 201 });
  } catch (error: unknown) {
    logger.error('POST /api/items/:id/designs error', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to create design' },
      { status: (error as { statusCode?: number }).statusCode || 500 }
    );
  }
}
