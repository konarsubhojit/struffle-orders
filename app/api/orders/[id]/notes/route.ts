import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import OrderNote from '@/lib/models/OrderNote';
import Order from '@/lib/models/Order';
import { createLogger } from '@/lib/utils/logger';
import type { OrderNoteType } from '@/types';

const logger = createLogger('OrderNotesAPI');

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/orders/[id]/notes - Get all notes for an order
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const numericId = Number.parseInt(id, 10);

    if (Number.isNaN(numericId)) {
      return NextResponse.json(
        { message: 'Invalid order ID' },
        { status: 400 }
      );
    }

    // Verify order exists
    const order = await Order.findById(numericId);
    if (!order) {
      return NextResponse.json(
        { message: 'Order not found' },
        { status: 404 }
      );
    }

    const notes = await OrderNote.findByOrderId(numericId);

    return NextResponse.json({ items: notes });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch order notes';
    logger.error('GET /api/orders/[id]/notes error', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orders/[id]/notes - Create a new note for an order
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const numericId = Number.parseInt(id, 10);

    if (Number.isNaN(numericId)) {
      return NextResponse.json(
        { message: 'Invalid order ID' },
        { status: 400 }
      );
    }

    // Verify order exists
    const order = await Order.findById(numericId);
    if (!order) {
      return NextResponse.json(
        { message: 'Order not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { noteText, noteType, isPinned } = body;

    // Validate noteText is required
    if (!noteText?.trim()) {
      return NextResponse.json(
        { message: 'Note text is required' },
        { status: 400 }
      );
    }

    // Validate noteType
    const validNoteTypes: OrderNoteType[] = ['internal', 'customer', 'system'];
    if (!noteType || !validNoteTypes.includes(noteType)) {
      return NextResponse.json(
        { message: 'Invalid note type. Must be one of: internal, customer, system' },
        { status: 400 }
      );
    }

    const note = await OrderNote.create({
      orderId: numericId,
      noteText: noteText.trim(),
      noteType,
      isPinned: isPinned ?? false,
      userId: session.user?.id ? Number(session.user.id) : null,
      userEmail: session.user?.email || null,
      userName: session.user?.name || null,
    });

    logger.info('Order note created', {
      noteId: note.id,
      orderId: numericId,
      noteType,
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create order note';
    logger.error('POST /api/orders/[id]/notes error', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}
