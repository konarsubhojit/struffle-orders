import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/utils/logger';
import { runDailyDigest } from '@/lib/services/digestService';

// Disable Next.js caching - use only Redis
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const logger = createLogger('DigestAPI');

/**
 * Verify digest job secret
 * Protects the internal digest endpoint from unauthorized access
 * Supports both X-DIGEST-SECRET header and Vercel's CRON_SECRET authorization
 */
function verifyDigestSecret(request: NextRequest): boolean {
  const providedSecret = request.headers.get('x-digest-secret');
  const expectedSecret = process.env.DIGEST_JOB_SECRET;
  
  // Also check for Vercel Cron's authorization header
  const authHeader = request.headers.get('authorization');
  const vercelCronSecret = process.env.CRON_SECRET;

  // Check X-DIGEST-SECRET first
  if (expectedSecret && providedSecret === expectedSecret) {
    return true;
  }
  
  // Check Vercel's CRON_SECRET authorization
  if (vercelCronSecret && authHeader === `Bearer ${vercelCronSecret}`) {
    logger.debug('Verified via Vercel CRON_SECRET');
    return true;
  }

  return false;
}

/**
 * POST /api/internal/digest/run - Trigger the daily digest email
 * 
 * Protected by X-DIGEST-SECRET header (must match DIGEST_JOB_SECRET env var)
 * This is meant to be triggered by Vercel Cron at 09:00 IST (03:30 UTC)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    if (!verifyDigestSecret(request)) {
      const providedSecret = request.headers.get('x-digest-secret');
      const authHeader = request.headers.get('authorization');
      const expectedSecret = process.env.DIGEST_JOB_SECRET;
      const vercelCronSecret = process.env.CRON_SECRET;
      
      if (!expectedSecret && !vercelCronSecret) {
        logger.error('Neither DIGEST_JOB_SECRET nor CRON_SECRET environment variable is set');
        return NextResponse.json(
          { message: 'Server configuration error' },
          { status: 500 }
        );
      }

      logger.warn('Invalid or missing digest secret', { 
        hasXDigestSecret: !!providedSecret,
        hasAuthHeader: !!authHeader
      });
      
      return NextResponse.json(
        { message: 'Invalid or missing authentication' },
        { status: 401 }
      );
    }

    logger.info('Digest run triggered');

    const result = await runDailyDigest();
    
    if (result.status === 'already_sent') {
      return NextResponse.json({
        message: 'Digest already sent for today',
        digestDate: result.digestDate
      });
    }
    
    return NextResponse.json({
      message: 'Digest completed successfully',
      ...result
    });
  } catch (error: unknown) {
    logger.error('Digest run failed', error);
    
    // Return 500 so Vercel Cron can detect failure
    return NextResponse.json(
      {
        message: 'Digest failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
