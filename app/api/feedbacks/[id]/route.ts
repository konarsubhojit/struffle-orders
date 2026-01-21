import { NextRequest, NextResponse } from 'next/server';
import Feedback from '@/lib/models/Feedback';
import { createLogger } from '@/lib/utils/logger';
import { MAX_RESPONSE_LENGTH } from '@/lib/constants/feedbackConstants';
import { invalidateFeedbackCache } from '@/lib/middleware/cache';

// Disable Next.js caching - use only Redis
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const logger = createLogger('FeedbackByIdAPI');

/**
 * GET /api/feedbacks/[id] - Get feedback by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const feedback = await Feedback.findById(id);
    
    if (!feedback) {
      return NextResponse.json(
        { message: 'Feedback not found' },
        { status: 404 }
      );
    }
    
    logger.debug('Feedback retrieved', { feedbackId: id });
    
    return NextResponse.json(feedback);
  } catch (error: unknown) {
    logger.error('GET /api/feedbacks/[id] error', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to fetch feedback' },
      { status: (error as { statusCode?: number }).statusCode || 500 }
    );
  }
}

/**
 * PUT /api/feedbacks/[id] - Update feedback (add response)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { responseText, isPublic } = body;

    const existingFeedback = await Feedback.findById(id);
    if (!existingFeedback) {
      return NextResponse.json(
        { message: 'Feedback not found' },
        { status: 404 }
      );
    }

    // Validate response text
    if (responseText && typeof responseText === 'string' && responseText.length > MAX_RESPONSE_LENGTH) {
      return NextResponse.json(
        { message: `Response cannot exceed ${MAX_RESPONSE_LENGTH} characters` },
        { status: 400 }
      );
    }

    const updateData: any = {};
    
    if (responseText !== undefined) {
      updateData.responseText = responseText;
      updateData.respondedAt = new Date();
    }
    
    if (isPublic !== undefined) {
      updateData.isPublic = isPublic ? 1 : 0;
    }

    const updatedFeedback = await Feedback.findByIdAndUpdate(id, updateData);
    if (!updatedFeedback) {
      return NextResponse.json(
        { message: 'Feedback not found' },
        { status: 404 }
      );
    }
    
    // Invalidate feedback cache after update
    await invalidateFeedbackCache();
    
    logger.info('Feedback updated', { feedbackId: id });
    
    return NextResponse.json(updatedFeedback);
  } catch (error: unknown) {
    logger.error('PUT /api/feedbacks/[id] error', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to update feedback' },
      { status: (error as { statusCode?: number }).statusCode || 500 }
    );
  }
}

/**
 * DELETE /api/feedbacks/[id] - Delete feedback
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // First check if feedback exists
    const feedback = await Feedback.findById(id);
    if (!feedback) {
      return NextResponse.json(
        { message: 'Feedback not found' },
        { status: 404 }
      );
    }
    
    // Delete using raw database access since model doesn't have delete method
    const { getDatabase } = await import('@/lib/db/connection');
    const { feedbacks } = await import('@/lib/db/schema');
    const { eq } = await import('drizzle-orm');
    
    const db = getDatabase();
    await db.delete(feedbacks).where(eq(feedbacks.id, Number.parseInt(id, 10)));
    
    // Invalidate feedback cache after deletion
    await invalidateFeedbackCache();
    
    logger.info('Feedback deleted', { feedbackId: id });
    
    return NextResponse.json({ message: 'Feedback deleted' });
  } catch (error: unknown) {
    logger.error('DELETE /api/feedbacks/[id] error', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to delete feedback' },
      { status: (error as { statusCode?: number }).statusCode || 500 }
    );
  }
}
