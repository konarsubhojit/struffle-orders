import { NextRequest, NextResponse } from 'next/server';
import Feedback from '@/lib/models/Feedback';
import FeedbackToken from '@/lib/models/FeedbackToken';
import Order from '@/lib/models/Order';
import { createLogger } from '@/lib/utils/logger';

// Disable Next.js caching - use only Redis
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const logger = createLogger('GenerateFeedbackTokenAPI');

/**
 * POST /api/feedbacks/generate-token/[orderId] - Generate secure feedback token for an order
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    
    // Check if order exists and is completed
    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json(
        { message: 'Order not found' },
        { status: 404 }
      );
    }
    
    if (order.status !== 'completed') {
      return NextResponse.json(
        { message: 'Feedback tokens can only be generated for completed orders' },
        { status: 400 }
      );
    }
    
    // Check if feedback already exists
    const existingFeedback = await Feedback.findByOrderId(orderId);
    if (existingFeedback) {
      return NextResponse.json(
        { message: 'Feedback already submitted for this order' },
        { status: 400 }
      );
    }
    
    // Generate or get existing token
    const tokenData = await FeedbackToken.getOrCreateForOrder(Number.parseInt(orderId, 10));
    
    logger.info('Feedback token generated', { orderId, tokenId: tokenData.id });
    
    return NextResponse.json({
      token: tokenData.token,
      expiresAt: tokenData.expiresAt
    });
  } catch (error: unknown) {
    logger.error('POST /api/feedbacks/generate-token/[orderId] error', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to generate feedback token' },
      { status: (error as { statusCode?: number }).statusCode || 500 }
    );
  }
}
