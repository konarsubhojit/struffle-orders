import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import User from '@/lib/models/User';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('UserRoleAPI');

// Disable Next.js caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/users/[id]/role - Update user role (admin only)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if current user is admin
    if (session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden: Admin access required' }, { status: 403 });
    }
    
    const { id } = await params;
    const userId = parseInt(id, 10);
    
    if (isNaN(userId)) {
      return NextResponse.json({ message: 'Invalid user ID' }, { status: 400 });
    }
    
    const body = await request.json();
    const { role } = body;
    
    // Validate role
    if (!role || !['admin', 'user'].includes(role)) {
      return NextResponse.json(
        { message: 'Invalid role. Must be "admin" or "user"' },
        { status: 400 }
      );
    }
    
    // Prevent self-demotion (admin cannot remove their own admin role)
    if (userId === session.user.dbUserId && role !== 'admin') {
      return NextResponse.json(
        { message: 'Cannot remove your own admin privileges' },
        { status: 400 }
      );
    }
    
    const updatedUser = await User.updateUserRole(userId, role);
    
    if (!updatedUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    
    logger.info('User role updated', {
      userId,
      newRole: role,
      updatedBy: session.user.dbUserId,
    });
    
    return NextResponse.json({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      updatedAt: updatedUser.updatedAt,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update user role';
    logger.error('PATCH /api/users/[id]/role error', error);
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
