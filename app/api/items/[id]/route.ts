import { NextRequest, NextResponse } from 'next/server';
import Item from '@/lib/models/Item';
import { createLogger } from '@/lib/utils/logger';
import { invalidateItemCache } from '@/lib/middleware/cache';
import { getStorageProvider } from '@/lib/storage';
import { uploadDataImage } from '@/lib/storage/images';

// Disable Next.js caching - use only Redis
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const logger = createLogger('ItemByIdAPI');

async function handleImageUpdate(image: unknown, existingImageUrl: string) {
  let newImageUrl = existingImageUrl;
  let oldImageUrl = null;

  if (image && typeof image === 'string' && image.startsWith('data:image/')) {
    oldImageUrl = existingImageUrl;
    newImageUrl = await uploadDataImage(image, 'items');
    logger.info('New image uploaded to blob storage', { url: newImageUrl });
  } else if (image === null || image === '') {
    oldImageUrl = existingImageUrl;
    newImageUrl = '';
  }

  return { newImageUrl, oldImageUrl };
}

async function deleteOldImage(oldImageUrl: string | null) {
  if (!oldImageUrl) return;
  
  try {
    await getStorageProvider().delete(oldImageUrl);
    logger.info('Old image deleted from blob storage', { url: oldImageUrl });
  } catch (deleteError: any) {
    logger.warn('Failed to delete old image from blob storage', { url: oldImageUrl, error: deleteError.message });
  }
}

/**
 * GET /api/items/[id] - Get a single item by ID
 */
export async function GET(
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
    
    logger.debug('GET /api/items/[id] success', { itemId: id });
    
    return NextResponse.json(item);
  } catch (error: unknown) {
    logger.error('GET /api/items/[id] error', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to fetch item' },
      { status: (error as { statusCode?: number }).statusCode || 500 }
    );
  }
}

/**
 * PUT /api/items/[id] - Update an item
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, price, color, fabric, specialFeatures, image } = body;

    // Validate name
    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      return NextResponse.json(
        { message: 'Item name cannot be empty' },
        { status: 400 }
      );
    }

    // Validate price
    if (price !== undefined) {
      const parsedPrice = Number.parseFloat(price);
      if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
        return NextResponse.json(
          { message: 'Valid price is required' },
          { status: 400 }
        );
      }
    }

    const existingItem = await Item.findById(id);
    if (!existingItem) {
      return NextResponse.json(
        { message: 'Item not found' },
        { status: 404 }
      );
    }

    // Handle image update
    let imageResult;
    try {
      imageResult = await handleImageUpdate(image, existingItem.imageUrl);
    } catch (uploadError: any) {
      logger.error('Failed to upload image to blob storage', uploadError);
      return NextResponse.json(
        { message: uploadError.message },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (price !== undefined) updateData.price = Number.parseFloat(price);
    if (color !== undefined) updateData.color = color;
    if (fabric !== undefined) updateData.fabric = fabric;
    if (specialFeatures !== undefined) updateData.specialFeatures = specialFeatures;
    if (imageResult.newImageUrl !== existingItem.imageUrl) updateData.imageUrl = imageResult.newImageUrl;

    const updatedItem = await Item.findByIdAndUpdate(id, updateData);
    if (!updatedItem) {
      return NextResponse.json(
        { message: 'Item not found' },
        { status: 404 }
      );
    }

    // Delete old image if needed
    await deleteOldImage(imageResult.oldImageUrl);
    
    // Invalidate item cache after update
    await invalidateItemCache();
    
    logger.info('Item updated', { itemId: updatedItem._id, name: updatedItem.name });
    
    return NextResponse.json(updatedItem);
  } catch (error: unknown) {
    logger.error('PUT /api/items/[id] error', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to update item' },
      { status: (error as { statusCode?: number }).statusCode || 500 }
    );
  }
}

/**
 * DELETE /api/items/[id] - Soft delete an item
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await Item.findByIdAndDelete(id);
    if (!item) {
      return NextResponse.json(
        { message: 'Item not found' },
        { status: 404 }
      );
    }
    
    // Invalidate item cache after deletion
    await invalidateItemCache();
    
    logger.info('Item soft deleted', { itemId: id });
    
    return NextResponse.json({ message: 'Item deleted' });
  } catch (error: unknown) {
    logger.error('DELETE /api/items/[id] error', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to delete item' },
      { status: (error as { statusCode?: number }).statusCode || 500 }
    );
  }
}
