import { NextRequest, NextResponse } from 'next/server';
import Tag from '@/lib/models/Tag';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('TagsAPI');

export const dynamic = 'force-dynamic';

/**
 * GET /api/tags - Get all tags
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeItemCounts = searchParams.get('counts') === 'true';

    const tags = await Tag.findAll(includeItemCounts);

    return NextResponse.json({ items: tags });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch tags';
    logger.error('GET /api/tags error', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tags - Create a new tag
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, color } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { message: 'Tag name is required' },
        { status: 400 }
      );
    }

    const tag = await Tag.create({ name, color });

    logger.info('Tag created', { tagId: tag.id, name: tag.name });

    return NextResponse.json(tag, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create tag';
    
    if (errorMessage.includes('unique') || errorMessage.includes('duplicate')) {
      return NextResponse.json(
        { message: 'A tag with this name already exists' },
        { status: 409 }
      );
    }
    
    logger.error('POST /api/tags error', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}
