import { NextRequest, NextResponse } from 'next/server';
import Feedback from '@/lib/models/Feedback';
import FeedbackToken from '@/lib/models/FeedbackToken';
import Order from '@/lib/models/Order';
import { createLogger } from '@/lib/utils/logger';
import {
  MIN_RATING,
  MAX_RATING,
  MAX_COMMENT_LENGTH
} from '@/lib/constants/feedbackConstants';

// Disable Next.js caching - use only Redis
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const logger = createLogger('PublicFeedbacksAPI');

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
 * POST /api/public/feedbacks - Public endpoint for customers to submit feedback
 * This endpoint does NOT require authentication - uses token-based validation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, rating, comment, productQuality, deliveryExperience } = body;

    if (!token) {
      return NextResponse.json(
        { message: 'Token is required' },
        { status: 400 }
      );
    }

    // Validate token
    const tokenData = await FeedbackToken.validateToken(token);
    if (!tokenData) {
      return NextResponse.json(
        { message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Check if feedback already exists for this order
    const existingFeedback = await Feedback.findByOrderId(tokenData.orderId);
    if (existingFeedback) {
      return NextResponse.json(
        { message: 'Feedback already submitted for this order' },
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
      orderId: tokenData.orderId,
      rating: ratingValidation.parsedRating,
      comment: comment || '',
      productQuality: productQualityValidation.parsedRating,
      deliveryExperience: deliveryValidation.parsedRating,
      isPublic: 1
    };

    const newFeedback = await Feedback.create(feedbackData);
    
    // Mark token as used
    await FeedbackToken.markAsUsed(token);
    
    logger.info('Public feedback created', { feedbackId: newFeedback.id, orderId: tokenData.orderId });
    
    return NextResponse.json(newFeedback, { status: 201 });
  } catch (error: unknown) {
    logger.error('POST /api/public/feedbacks error', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to submit feedback' },
      { status: (error as { statusCode?: number }).statusCode || 500 }
    );
  }
}
