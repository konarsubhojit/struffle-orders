import { NextRequest, NextResponse } from 'next/server';
import AuditLog from '@/lib/models/AuditLog';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('AuditLogsRecentAPI');

export const dynamic = 'force-dynamic';

/**
 * GET /api/audit-logs/recent - Get recent activity for dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number.parseInt(searchParams.get('limit') || '10', 10);

    const recentActivity = await AuditLog.getRecentActivity(Math.min(limit, 50));

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
