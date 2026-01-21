import { NextRequest, NextResponse } from 'next/server';
import Feedback from '@/lib/models/Feedback';
import { createLogger } from '@/lib/utils/logger';

// Disable Next.js caching - use only Redis
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const logger = createLogger('FeedbackByOrderAPI');

/**
 * GET /api/feedbacks/order/[orderId] - Get feedback by order ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const feedback = await Feedback.findByOrderId(orderId);
    
    if (!feedback) {
      return NextResponse.json(
        { message: 'Feedback not found for this order' },
        { status: 404 }
      );
    }
    
    logger.debug('Feedback retrieved by order ID', { orderId });
    
    return NextResponse.json(feedback);
  } catch (error: unknown) {
    logger.error('GET /api/feedbacks/order/[orderId] error', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to fetch feedback' },
      { status: (error as { statusCode?: number }).statusCode || 500 }
    );
  }
}
