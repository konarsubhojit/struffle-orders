import { NextRequest, NextResponse } from 'next/server';
import { isDigestRequestAuthorized } from '@/lib/services/digestAuth';
import { runSalesDigest, type DigestPeriod } from '@/lib/services/digestService';
import { createLogger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const logger = createLogger('DigestAPI');

export async function POST(request: NextRequest) {
  if (!isDigestRequestAuthorized(request.headers)) {
    logger.warn('Rejected unauthenticated digest request');
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const period = request.nextUrl.searchParams.get('period') || 'daily';
  if (period !== 'daily' && period !== 'weekly') {
    return NextResponse.json({ message: 'period must be daily or weekly' }, { status: 400 });
  }

  try {
    return NextResponse.json(await runSalesDigest(period as DigestPeriod));
  } catch (error) {
    logger.error('Digest run failed', error);
    return NextResponse.json(
      { message: 'Digest failed', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
