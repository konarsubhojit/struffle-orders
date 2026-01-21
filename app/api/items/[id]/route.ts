import { NextRequest, NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
import Item from '@/lib/models/Item';
import { createLogger } from '@/lib/utils/logger';
import { invalidateItemCache } from '@/lib/middleware/cache';
import { IMAGE_CONFIG } from '@/lib/constants/imageConstants';

// Disable Next.js caching - use only Redis
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const logger = createLogger('ItemByIdAPI');

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

async function handleImageUpdate(image: any, existingImageUrl: string) {
  let newImageUrl = existingImageUrl;
  let oldImageUrl = null;

  if (image && typeof image === 'string' && image.startsWith('data:image/')) {
    oldImageUrl = existingImageUrl;
    newImageUrl = await uploadImage(image);
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
    await del(oldImageUrl);
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
