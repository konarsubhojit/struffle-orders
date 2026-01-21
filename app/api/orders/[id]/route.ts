import { NextRequest, NextResponse } from 'next/server';
import Order from '@/lib/models/Order';
import { createLogger } from '@/lib/utils/logger';
import { invalidateOrderCache } from '@/lib/middleware/cache';

// Disable Next.js caching - use only Redis
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const logger = createLogger('OrderByIdAPI');

/**
 * GET /api/orders/[id] - Get order by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await Order.findById(id);
    
    if (!order) {
      return NextResponse.json(
        { message: 'Order not found' },
        { status: 404 }
      );
    }
    
    logger.debug('Order retrieved', { orderId: id });
    
    // No Cache-Control header - rely on Redis caching with version control
    return NextResponse.json(order);
  } catch (error: unknown) {
    logger.error('GET /api/orders/[id] error', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to fetch order' },
      { status: (error as { statusCode?: number }).statusCode || 500 }
    );
  }
}

/**
 * PUT /api/orders/[id] - Update order
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existingOrder = await Order.findById(id);
    if (!existingOrder) {
      return NextResponse.json(
        { message: 'Order not found' },
        { status: 404 }
      );
    }

    // Build update data from request body
    const updateData: any = {};
    
    // Allow updating specific fields
    if (body.status !== undefined) updateData.status = body.status;
    if (body.paymentStatus !== undefined) updateData.paymentStatus = body.paymentStatus;
    if (body.paidAmount !== undefined) updateData.paidAmount = Number.parseFloat(body.paidAmount);
    if (body.confirmationStatus !== undefined) updateData.confirmationStatus = body.confirmationStatus;
    if (body.customerNotes !== undefined) updateData.customerNotes = body.customerNotes;
    if (body.priority !== undefined) updateData.priority = Number.parseInt(body.priority, 10);
    if (body.expectedDeliveryDate !== undefined) {
      updateData.expectedDeliveryDate = body.expectedDeliveryDate ? new Date(body.expectedDeliveryDate) : null;
    }
    if (body.deliveryStatus !== undefined) updateData.deliveryStatus = body.deliveryStatus;
    if (body.trackingId !== undefined) updateData.trackingId = body.trackingId;
    if (body.deliveryPartner !== undefined) updateData.deliveryPartner = body.deliveryPartner;
    if (body.actualDeliveryDate !== undefined) {
      updateData.actualDeliveryDate = body.actualDeliveryDate ? new Date(body.actualDeliveryDate) : null;
    }
    if (body.address !== undefined) updateData.address = body.address;

    // If items are being updated, recalculate total price
    if (body.items && Array.isArray(body.items)) {
      let totalPrice = 0;
      const validatedItems = [];

      for (const item of body.items) {
        const itemPrice = Number.parseFloat(item.price);
        const quantity = Number.parseInt(item.quantity, 10);

        if (Number.isNaN(itemPrice) || itemPrice < 0) {
          return NextResponse.json(
            { message: 'Item price must be a valid non-negative number' },
            { status: 400 }
          );
        }

        if (Number.isNaN(quantity) || quantity <= 0) {
          return NextResponse.json(
            { message: 'Item quantity must be a positive integer' },
            { status: 400 }
          );
        }

        totalPrice += itemPrice * quantity;
        validatedItems.push({
          itemId: Number.parseInt(item.itemId, 10),
          name: item.name,
          price: itemPrice,
          quantity: quantity,
          customizationRequest: item.customizationRequest || ''
        });
      }

      updateData.items = validatedItems;
      updateData.totalPrice = totalPrice;
    }

    const updatedOrder = await Order.findByIdAndUpdate(id, updateData);
    if (!updatedOrder) {
      return NextResponse.json(
        { message: 'Order not found' },
        { status: 404 }
      );
    }
    
    // Invalidate order cache after update
    await invalidateOrderCache();
    
    logger.info('Order updated', { orderId: id });
    
    return NextResponse.json(updatedOrder);
  } catch (error: unknown) {
    logger.error('PUT /api/orders/[id] error', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to update order' },
      { status: (error as { statusCode?: number }).statusCode || 500 }
    );
  }
}
