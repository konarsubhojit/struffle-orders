import { NextRequest, NextResponse } from 'next/server';
import Category from '@/lib/models/Category';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('CategoryAPI');

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/categories/[id] - Get a single category
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const numericId = Number.parseInt(id, 10);
    
    if (Number.isNaN(numericId)) {
      return NextResponse.json(
        { message: 'Invalid category ID' },
        { status: 400 }
      );
    }

    const category = await Category.findById(numericId);
    
    if (!category) {
      return NextResponse.json(
        { message: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(category);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch category';
    logger.error('GET /api/categories/[id] error', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/categories/[id] - Update a category
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const numericId = Number.parseInt(id, 10);
    
    if (Number.isNaN(numericId)) {
      return NextResponse.json(
        { message: 'Invalid category ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, description, color, parentId, displayOrder } = body;

    // Prevent setting parent to self
    if (parentId === numericId) {
      return NextResponse.json(
        { message: 'Category cannot be its own parent' },
        { status: 400 }
      );
    }

    const category = await Category.update(numericId, {
      name,
      description,
      color,
      parentId,
      displayOrder,
    });

    if (!category) {
      return NextResponse.json(
        { message: 'Category not found' },
        { status: 404 }
      );
    }

    logger.info('Category updated', { categoryId: category.id });

    return NextResponse.json(category);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update category';
    
    if (errorMessage.includes('unique') || errorMessage.includes('duplicate')) {
      return NextResponse.json(
        { message: 'A category with this name already exists' },
        { status: 409 }
      );
    }
    
    logger.error('PUT /api/categories/[id] error', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/categories/[id] - Delete a category
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const numericId = Number.parseInt(id, 10);
    
    if (Number.isNaN(numericId)) {
      return NextResponse.json(
        { message: 'Invalid category ID' },
        { status: 400 }
      );
    }

    const deleted = await Category.delete(numericId);

    if (!deleted) {
      return NextResponse.json(
        { message: 'Category not found' },
        { status: 404 }
      );
    }

    logger.info('Category deleted', { categoryId: numericId });

    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete category';
    logger.error('DELETE /api/categories/[id] error', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}
