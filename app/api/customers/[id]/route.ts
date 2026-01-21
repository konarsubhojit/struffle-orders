import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Customer from '@/lib/models/Customer';
import { createLogger } from '@/lib/utils/logger';
import type { CustomerSource } from '@/types/entities';

const logger = createLogger('CustomerByIdAPI');

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VALID_SOURCES: CustomerSource[] = ['walk-in', 'online', 'referral', 'other'];

/**
 * GET /api/customers/[id] - Get single customer by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const numericId = Number.parseInt(id, 10);

    if (Number.isNaN(numericId)) {
      return NextResponse.json(
        { message: 'Invalid customer ID' },
        { status: 400 }
      );
    }

    const customer = await Customer.findById(numericId);

    if (!customer) {
      return NextResponse.json(
        { message: 'Customer not found' },
        { status: 404 }
      );
    }

    logger.debug('Customer retrieved', { customerId: id });

    return NextResponse.json(customer);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch customer';
    logger.error('GET /api/customers/[id] error', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/customers/[id] - Update customer
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const numericId = Number.parseInt(id, 10);

    if (Number.isNaN(numericId)) {
      return NextResponse.json(
        { message: 'Invalid customer ID' },
        { status: 400 }
      );
    }

    // Check if customer exists
    const existingCustomer = await Customer.findById(numericId);
    if (!existingCustomer) {
      return NextResponse.json(
        { message: 'Customer not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, email, phone, address, source, notes, customerId } = body;

    // Validate source if provided
    if (source !== undefined && source !== null && !VALID_SOURCES.includes(source)) {
      return NextResponse.json(
        { message: `Invalid source. Must be one of: ${VALID_SOURCES.join(', ')}` },
        { status: 400 }
      );
    }

    // Check for duplicate customerId if being changed
    if (customerId && customerId !== existingCustomer.customerId) {
      const duplicateCheck = await Customer.findByCustomerId(customerId);
      if (duplicateCheck) {
        return NextResponse.json(
          { message: 'A customer with this ID already exists' },
          { status: 409 }
        );
      }
    }

    const updatedCustomer = await Customer.update(numericId, {
      customerId,
      name,
      email,
      phone,
      address,
      source,
      notes,
    });

    if (!updatedCustomer) {
      return NextResponse.json(
        { message: 'Failed to update customer' },
        { status: 500 }
      );
    }

    logger.info('Customer updated', {
      customerId: numericId,
      businessId: updatedCustomer.customerId,
      userId: session.user.dbUserId,
    });

    return NextResponse.json(updatedCustomer);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update customer';
    
    // Handle unique constraint violation
    if (errorMessage.includes('unique') || errorMessage.includes('duplicate')) {
      return NextResponse.json(
        { message: 'A customer with this ID already exists' },
        { status: 409 }
      );
    }
    
    logger.error('PUT /api/customers/[id] error', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/customers/[id] - Delete customer
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const numericId = Number.parseInt(id, 10);

    if (Number.isNaN(numericId)) {
      return NextResponse.json(
        { message: 'Invalid customer ID' },
        { status: 400 }
      );
    }

    // Check if customer exists
    const existingCustomer = await Customer.findById(numericId);
    if (!existingCustomer) {
      return NextResponse.json(
        { message: 'Customer not found' },
        { status: 404 }
      );
    }

    const deleted = await Customer.delete(numericId);

    if (!deleted) {
      return NextResponse.json(
        { message: 'Failed to delete customer' },
        { status: 500 }
      );
    }

    logger.info('Customer deleted', {
      customerId: numericId,
      businessId: existingCustomer.customerId,
      userId: session.user.dbUserId,
    });

    return NextResponse.json({ message: 'Customer deleted successfully' });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete customer';
    logger.error('DELETE /api/customers/[id] error', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}
