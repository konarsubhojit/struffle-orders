import { NextRequest, NextResponse } from 'next/server';
import Tag from '@/lib/models/Tag';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('TagAPI');

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/tags/[id] - Get a single tag
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const numericId = Number.parseInt(id, 10);
    
    if (Number.isNaN(numericId)) {
      return NextResponse.json(
        { message: 'Invalid tag ID' },
        { status: 400 }
      );
    }

    const tag = await Tag.findById(numericId);
    
    if (!tag) {
      return NextResponse.json(
        { message: 'Tag not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(tag);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch tag';
    logger.error('GET /api/tags/[id] error', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/tags/[id] - Update a tag
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const numericId = Number.parseInt(id, 10);
    
    if (Number.isNaN(numericId)) {
      return NextResponse.json(
        { message: 'Invalid tag ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, color } = body;

    const tag = await Tag.update(numericId, { name, color });

    if (!tag) {
      return NextResponse.json(
        { message: 'Tag not found' },
        { status: 404 }
      );
    }

    logger.info('Tag updated', { tagId: tag.id });

    return NextResponse.json(tag);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update tag';
    
    if (errorMessage.includes('unique') || errorMessage.includes('duplicate')) {
      return NextResponse.json(
        { message: 'A tag with this name already exists' },
        { status: 409 }
      );
    }
    
    logger.error('PUT /api/tags/[id] error', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tags/[id] - Delete a tag
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const numericId = Number.parseInt(id, 10);
    
    if (Number.isNaN(numericId)) {
      return NextResponse.json(
        { message: 'Invalid tag ID' },
        { status: 400 }
      );
    }

    const deleted = await Tag.delete(numericId);

    if (!deleted) {
      return NextResponse.json(
        { message: 'Tag not found' },
        { status: 404 }
      );
    }

    logger.info('Tag deleted', { tagId: numericId });

    return NextResponse.json({ message: 'Tag deleted successfully' });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete tag';
    logger.error('DELETE /api/tags/[id] error', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}
