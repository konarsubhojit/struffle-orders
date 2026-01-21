import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import Feedback from '@/lib/models/Feedback';
// @ts-ignore
import { createLogger } from '@/lib/utils/logger';
// @ts-ignore
import { parsePaginationParams } from '@/lib/utils/pagination';
// @ts-ignore
import {
  MIN_RATING,
  MAX_RATING,
  MAX_COMMENT_LENGTH,
  MAX_RESPONSE_LENGTH
} from '@/lib/constants/feedbackConstants';
// @ts-ignore
import { invalidateFeedbackCache } from '@/lib/middleware/cache';

// Disable Next.js caching - use only Redis
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const logger = createLogger('FeedbacksAPI');

function validateRating(rating: any, fieldName: string = 'rating') {
  if (rating === undefined || rating === null) {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  const parsedRating = Number.parseInt(rating, 10);
  if (Number.isNaN(parsedRating) || parsedRating < MIN_RATING || parsedRating > MAX_RATING) {
    return { valid: false, error: `${fieldName} must be between ${MIN_RATING} and ${MAX_RATING}` };
  }
  
  return { valid: true, parsedRating };
}

function validateOptionalRating(rating: any, fieldName: string) {
  if (rating === undefined || rating === null) {
    return { valid: true, parsedRating: null };
  }
  
  return validateRating(rating, fieldName);
}

function validateComment(comment: any) {
  if (comment && typeof comment === 'string' && comment.length > MAX_COMMENT_LENGTH) {
    return { valid: false, error: `Comment cannot exceed ${MAX_COMMENT_LENGTH} characters` };
  }
  return { valid: true };
}

/**
 * GET /api/feedbacks - List feedbacks with pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePaginationParams(searchParams);
    
    logger.debug('GET /api/feedbacks request', { page, limit });
    
    const result = await Feedback.findPaginated({ page, limit });
    
    logger.debug('Returning paginated feedbacks', {
      feedbackCount: result.items.length,
      page: result.pagination.page,
      total: result.pagination.total
    });
    
    // No Cache-Control header - rely on Redis caching with version control
    return NextResponse.json(result);
  } catch (error: unknown) {
    logger.error('GET /api/feedbacks error', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to fetch feedbacks' },
      { status: (error as { statusCode?: number }).statusCode || 500 }
    );
  }
}

/**
 * POST /api/feedbacks - Create feedback (admin/internal use)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, rating, comment, productQuality, deliveryExperience, isPublic } = body;

    if (!orderId) {
      return NextResponse.json(
        { message: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Validate main rating
    const ratingValidation = validateRating(rating, 'rating');
    if (!ratingValidation.valid) {
      return NextResponse.json(
        { message: ratingValidation.error },
        { status: 400 }
      );
    }

    // Validate optional ratings
    const productQualityValidation = validateOptionalRating(productQuality, 'product quality');
    if (!productQualityValidation.valid && 'error' in productQualityValidation) {
      return NextResponse.json(
        { message: productQualityValidation.error },
        { status: 400 }
      );
    }

    const deliveryValidation = validateOptionalRating(deliveryExperience, 'delivery experience');
    if (!deliveryValidation.valid && 'error' in deliveryValidation) {
      return NextResponse.json(
        { message: deliveryValidation.error },
        { status: 400 }
      );
    }

    // Validate comment
    const commentValidation = validateComment(comment);
    if (!commentValidation.valid) {
      return NextResponse.json(
        { message: commentValidation.error },
        { status: 400 }
      );
    }

    const feedbackData: any = {
      orderId: Number.parseInt(orderId, 10),
      rating: ratingValidation.parsedRating,
      comment: comment || '',
      productQuality: productQualityValidation.parsedRating,
      deliveryExperience: deliveryValidation.parsedRating,
      isPublic: isPublic !== undefined ? (isPublic ? 1 : 0) : 1
    };

    const newFeedback = await Feedback.create(feedbackData);
    
    // Invalidate feedback cache after creation
    await invalidateFeedbackCache();
    
    logger.info('Feedback created', { feedbackId: newFeedback.id, orderId: newFeedback.orderId });
    
    return NextResponse.json(newFeedback, { status: 201 });
  } catch (error: unknown) {
    logger.error('POST /api/feedbacks error', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to create feedback' },
      { status: (error as { statusCode?: number }).statusCode || 500 }
    );
  }
}
