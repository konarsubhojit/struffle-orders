import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Customer from '@/lib/models/Customer';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('CustomerSearchAPI');

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/customers/search - Search customers for autocomplete
 * Query params: q (search query)
 * Returns CustomerSummary[] for quick lookup
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(Number.parseInt(limitParam, 10) || 10, 50) : 10;

    if (!query.trim()) {
      return NextResponse.json({ items: [] });
    }

    const customers = await Customer.search(query, limit);

    logger.debug('Customer search completed', {
      query,
      resultCount: customers.length,
    });

    return NextResponse.json({ items: customers });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to search customers';
    logger.error('GET /api/customers/search error', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}
