import { NextRequest, NextResponse } from 'next/server';
import Category from '@/lib/models/Category';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('CategoriesAPI');

export const dynamic = 'force-dynamic';

/**
 * GET /api/categories - Get all categories
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tree = searchParams.get('tree') === 'true';
    const includeItemCounts = searchParams.get('counts') === 'true';

    let categories;
    if (tree) {
      categories = await Category.findAsTree();
    } else {
      categories = await Category.findAll(includeItemCounts);
    }

    return NextResponse.json({ items: categories });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch categories';
    logger.error('GET /api/categories error', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/categories - Create a new category
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, color, parentId, displayOrder } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { message: 'Category name is required' },
        { status: 400 }
      );
    }

    const category = await Category.create({
      name,
      description,
      color,
      parentId,
      displayOrder,
    });

    logger.info('Category created', { categoryId: category.id, name: category.name });

    return NextResponse.json(category, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create category';
    
    // Handle unique constraint violation
    if (errorMessage.includes('unique') || errorMessage.includes('duplicate')) {
      return NextResponse.json(
        { message: 'A category with this name already exists' },
        { status: 409 }
      );
    }
    
    logger.error('POST /api/categories error', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}
