import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import AuditLog from '@/lib/models/AuditLog';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('AuditLogsRecentAPI');

export const dynamic = 'force-dynamic';

/**
 * GET /api/audit-logs/recent - Get recent activity for dashboard (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if current user is admin
    if (session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Number.parseInt(searchParams.get('limit') || '10', 10);
    const hours = Number.parseInt(searchParams.get('hours') || '24', 10);

    const recentActivity = await AuditLog.getRecentActivity(Math.min(limit, 50), hours);

    // Compute summary statistics
    const byAction: Record<string, number> = {};
    const byEntity: Record<string, number> = {};
    
    for (const log of recentActivity) {
      byAction[log.action] = (byAction[log.action] || 0) + 1;
      byEntity[log.entityType] = (byEntity[log.entityType] || 0) + 1;
    }

    return NextResponse.json({
      logs: recentActivity,
      summary: {
        total: recentActivity.length,
        byAction,
        byEntity,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch recent activity';
    logger.error('GET /api/audit-logs/recent error', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}
