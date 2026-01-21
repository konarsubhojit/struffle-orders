import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Customer from '@/lib/models/Customer';
import { createLogger } from '@/lib/utils/logger';
import type { CustomerSource } from '@/types/entities';

const logger = createLogger('CustomersAPI');

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VALID_SOURCES: CustomerSource[] = ['walk-in', 'online', 'referral', 'other'];

/**
 * GET /api/customers - List customers with pagination and search
 * Query params: page, limit, search, source
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get('page') || '1', 10);
    const limit = Number.parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search') || undefined;
    const sourceParam = searchParams.get('source');

    // Validate source parameter
    let source: CustomerSource | undefined;
    if (sourceParam && VALID_SOURCES.includes(sourceParam as CustomerSource)) {
      source = sourceParam as CustomerSource;
    }

    // Validate pagination params
    const validPage = Number.isNaN(page) || page < 1 ? 1 : page;
    const validLimit = Number.isNaN(limit) || limit < 1 || limit > 100 ? 20 : limit;

    const result = await Customer.findAll({
      page: validPage,
      limit: validLimit,
      search,
      source,
    });

    logger.debug('Customers retrieved', {
      count: result.customers.length,
      page: result.pagination.page,
      total: result.pagination.total,
    });

    return NextResponse.json({
      items: result.customers,
      pagination: result.pagination,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch customers';
    logger.error('GET /api/customers error', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/customers - Create a new customer
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, phone, address, source, notes, customerId } = body;

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json(
        { message: 'Customer name is required' },
        { status: 400 }
      );
    }

    // Validate source if provided
    if (source && !VALID_SOURCES.includes(source)) {
      return NextResponse.json(
        { message: `Invalid source. Must be one of: ${VALID_SOURCES.join(', ')}` },
        { status: 400 }
      );
    }

    // Check for duplicate customerId if provided
    if (customerId?.trim()) {
      const existing = await Customer.findByCustomerId(customerId);
      if (existing) {
        return NextResponse.json(
          { message: 'A customer with this ID already exists' },
          { status: 409 }
        );
      }
    }

    const customer = await Customer.create({
      customerId: customerId || '', // Will be auto-generated if empty
      name,
      email,
      phone,
      address,
      source,
      notes,
    });

    logger.info('Customer created', {
      customerId: customer.id,
      businessId: customer.customerId,
      name: customer.name,
      userId: session.user.dbUserId,
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create customer';
    
    // Handle unique constraint violation
    if (errorMessage.includes('unique') || errorMessage.includes('duplicate')) {
      return NextResponse.json(
        { message: 'A customer with this ID already exists' },
        { status: 409 }
      );
    }
    
    logger.error('POST /api/customers error', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}
