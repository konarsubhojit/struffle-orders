import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import OrderNote from '@/lib/models/OrderNote';
import Order from '@/lib/models/Order';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('OrderNoteAPI');

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string; noteId: string }>;
}

/**
 * GET /api/orders/[id]/notes/[noteId] - Get a single note
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

    const { id, noteId } = await params;
    const numericOrderId = Number.parseInt(id, 10);
    const numericNoteId = Number.parseInt(noteId, 10);

    if (Number.isNaN(numericOrderId)) {
      return NextResponse.json(
        { message: 'Invalid order ID' },
        { status: 400 }
      );
    }

    if (Number.isNaN(numericNoteId)) {
      return NextResponse.json(
        { message: 'Invalid note ID' },
        { status: 400 }
      );
    }

    // Verify order exists
    const order = await Order.findById(numericOrderId);
    if (!order) {
      return NextResponse.json(
        { message: 'Order not found' },
        { status: 404 }
      );
    }

    const note = await OrderNote.findById(numericNoteId);

    if (!note) {
      return NextResponse.json(
        { message: 'Note not found' },
        { status: 404 }
      );
    }

    // Verify the note belongs to the order
    if (note.orderId !== numericOrderId) {
      return NextResponse.json(
        { message: 'Note does not belong to this order' },
        { status: 404 }
      );
    }

    return NextResponse.json(note);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch order note';
    logger.error('GET /api/orders/[id]/notes/[noteId] error', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/orders/[id]/notes/[noteId] - Update a note
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id, noteId } = await params;
    const numericOrderId = Number.parseInt(id, 10);
    const numericNoteId = Number.parseInt(noteId, 10);

    if (Number.isNaN(numericOrderId)) {
      return NextResponse.json(
        { message: 'Invalid order ID' },
        { status: 400 }
      );
    }

    if (Number.isNaN(numericNoteId)) {
      return NextResponse.json(
        { message: 'Invalid note ID' },
        { status: 400 }
      );
    }

    // Verify order exists
    const order = await Order.findById(numericOrderId);
    if (!order) {
      return NextResponse.json(
        { message: 'Order not found' },
        { status: 404 }
      );
    }

    // Verify note exists and belongs to order
    const existingNote = await OrderNote.findById(numericNoteId);
    if (!existingNote) {
      return NextResponse.json(
        { message: 'Note not found' },
        { status: 404 }
      );
    }

    if (existingNote.orderId !== numericOrderId) {
      return NextResponse.json(
        { message: 'Note does not belong to this order' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { noteText, isPinned } = body;

    // Build updates object
    const updates: { noteText?: string; isPinned?: boolean } = {};

    if (noteText !== undefined) {
      if (!noteText?.trim()) {
        return NextResponse.json(
          { message: 'Note text cannot be empty' },
          { status: 400 }
        );
      }
      updates.noteText = noteText.trim();
    }

    if (isPinned !== undefined) {
      updates.isPinned = Boolean(isPinned);
    }

    // Check if there's anything to update
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { message: 'No valid updates provided' },
        { status: 400 }
      );
    }

    const note = await OrderNote.update(numericNoteId, updates);

    if (!note) {
      return NextResponse.json(
        { message: 'Failed to update note' },
        { status: 500 }
      );
    }

    logger.info('Order note updated', {
      noteId: note.id,
      orderId: numericOrderId,
    });

    return NextResponse.json(note);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update order note';
    logger.error('PUT /api/orders/[id]/notes/[noteId] error', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/orders/[id]/notes/[noteId] - Delete a note
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id, noteId } = await params;
    const numericOrderId = Number.parseInt(id, 10);
    const numericNoteId = Number.parseInt(noteId, 10);

    if (Number.isNaN(numericOrderId)) {
      return NextResponse.json(
        { message: 'Invalid order ID' },
        { status: 400 }
      );
    }

    if (Number.isNaN(numericNoteId)) {
      return NextResponse.json(
        { message: 'Invalid note ID' },
        { status: 400 }
      );
    }

    // Verify order exists
    const order = await Order.findById(numericOrderId);
    if (!order) {
      return NextResponse.json(
        { message: 'Order not found' },
        { status: 404 }
      );
    }

    // Verify note exists and belongs to order
    const existingNote = await OrderNote.findById(numericNoteId);
    if (!existingNote) {
      return NextResponse.json(
        { message: 'Note not found' },
        { status: 404 }
      );
    }

    if (existingNote.orderId !== numericOrderId) {
      return NextResponse.json(
        { message: 'Note does not belong to this order' },
        { status: 404 }
      );
    }

    const deleted = await OrderNote.delete(numericNoteId);

    if (!deleted) {
      return NextResponse.json(
        { message: 'Failed to delete note' },
        { status: 500 }
      );
    }

    logger.info('Order note deleted', {
      noteId: numericNoteId,
      orderId: numericOrderId,
    });

    return NextResponse.json({ message: 'Note deleted successfully' });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete order note';
    logger.error('DELETE /api/orders/[id]/notes/[noteId] error', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}
