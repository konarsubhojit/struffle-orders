import { NextRequest, NextResponse } from 'next/server';
import AuditLog from '@/lib/models/AuditLog';
import { createLogger } from '@/lib/utils/logger';
import type { AuditAction, AuditEntityType } from '@/types';

const logger = createLogger('AuditLogsAPI');

export const dynamic = 'force-dynamic';

/**
 * GET /api/audit-logs - Get audit logs with pagination and filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const limit = Number.parseInt(searchParams.get('limit') || '50', 10);
    const offset = Number.parseInt(searchParams.get('offset') || '0', 10);
    const entityType = searchParams.get('entityType') as AuditEntityType | null;
    const action = searchParams.get('action') as AuditAction | null;
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const options: {
      limit: number;
      offset: number;
      entityType?: AuditEntityType;
      action?: AuditAction;
      userId?: number;
      startDate?: Date;
      endDate?: Date;
    } = {
      limit: Math.min(limit, 100), // Cap at 100
      offset,
    };

    if (entityType) options.entityType = entityType;
    if (action) options.action = action;
    if (userId) options.userId = Number.parseInt(userId, 10);
    if (startDate) options.startDate = new Date(startDate);
    if (endDate) options.endDate = new Date(endDate);

    const result = await AuditLog.findAll(options);

    return NextResponse.json(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch audit logs';
    logger.error('GET /api/audit-logs error', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}
