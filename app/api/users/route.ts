import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import User from '@/lib/models/User';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('UsersAPI');

// Disable Next.js caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/users - List all users (admin only)
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if current user is admin
    if (session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden: Admin access required' }, { status: 403 });
    }
    
    const allUsers = await User.findAll();
    
    logger.info('Users retrieved', { count: allUsers.length, adminId: session.user.dbUserId });
    
    return NextResponse.json(allUsers);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch users';
    logger.error('GET /api/users error', error);
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
