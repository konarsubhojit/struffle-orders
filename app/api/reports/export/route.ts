import { NextRequest, NextResponse } from 'next/server';
import ImportExportService from '@/lib/services/importExportService';
import ExcelExportService, { REPORT_COLUMNS } from '@/lib/services/excelExportService';
import AuditLog from '@/lib/models/AuditLog';
import { createLogger } from '@/lib/utils/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const logger = createLogger('ReportsExportAPI');

export const dynamic = 'force-dynamic';

type ExportFormat = 'csv' | 'tsv' | 'html' | 'xls';
type ReportType = 'orders' | 'salesSummary' | 'items' | 'customers' | 'auditLogs';

const VALID_FORMATS: ExportFormat[] = ['csv', 'tsv', 'html', 'xls'];
const VALID_REPORT_TYPES: ReportType[] = ['orders', 'salesSummary', 'items', 'customers', 'auditLogs'];

/**
 * GET /api/reports/export - Export reports in various formats
 * 
 * Query params:
 * - type: Report type (orders, salesSummary, items, customers, auditLogs)
 * - format: Export format (csv, tsv, html, xls)
 * - startDate: Start date filter (ISO string)
 * - endDate: End date filter (ISO string)
 * - status: Status filter (for orders)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user ? {
      id: (session.user as any).dbUserId as number | undefined,
      email: session.user.email || undefined,
      name: session.user.name || undefined,
    } : undefined;

    const { searchParams } = new URL(request.url);
    
    // Parse parameters
    const reportType = (searchParams.get('type') || 'orders') as ReportType;
    const format = (searchParams.get('format') || 'xls') as ExportFormat;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const currency = searchParams.get('currency') || '₹';

    // Validate parameters
    if (!VALID_REPORT_TYPES.includes(reportType)) {
      return NextResponse.json(
        { message: `Invalid report type. Must be one of: ${VALID_REPORT_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    if (!VALID_FORMATS.includes(format)) {
      return NextResponse.json(
        { message: `Invalid format. Must be one of: ${VALID_FORMATS.join(', ')}` },
        { status: 400 }
      );
    }

    // Get data based on report type
    let data: Record<string, unknown>[] = [];
    let columns = REPORT_COLUMNS[reportType];
    let title = '';

    const filters: {
      startDate?: Date;
      endDate?: Date;
      status?: string;
    } = {};

    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (status) filters.status = status;

    switch (reportType) {
      case 'orders':
        data = await ImportExportService.exportOrders(filters) as unknown as Record<string, unknown>[];
        title = 'Orders Report';
        break;

      case 'auditLogs':
        const auditResult = await AuditLog.findAll({
          limit: 1000,
          startDate: filters.startDate,
          endDate: filters.endDate,
        });
        data = auditResult.items.map((log: Record<string, unknown>) => ({
          ...log,
          changedFields: Array.isArray(log.changedFields) ? (log.changedFields as string[]).join(', ') : '',
        }));
        title = 'Audit Log Report';
        break;

      // Add more report types as needed
      default:
        data = await ImportExportService.exportOrders(filters) as unknown as Record<string, unknown>[];
        title = 'Report';
    }

    // Generate report
    const report = ExcelExportService.generateReport(data, columns, format, {
      title,
      sheetName: reportType,
      currency,
    });

    // Log audit
    await AuditLog.create({
      entityType: 'order', // Using 'order' as a general entity for reports
      entityId: 0,
      action: 'bulk_export',
      userId: user?.id,
      userEmail: user?.email,
      userName: user?.name,
      metadata: {
        reportType,
        format,
        recordCount: data.length,
        filters,
      },
    });

    logger.info('Report exported', {
      reportType,
      format,
      recordCount: data.length,
    });

    // Generate filename
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `${reportType}_report_${dateStr}${report.extension}`;

    return new NextResponse(report.content, {
      headers: {
        'Content-Type': report.mimeType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to export report';
    logger.error('GET /api/reports/export error', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}
