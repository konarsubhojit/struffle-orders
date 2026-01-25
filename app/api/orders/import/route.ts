import { NextRequest, NextResponse } from 'next/server';
import ImportExportService from '@/lib/services/importExportService';
import AuditLog from '@/lib/models/AuditLog';
import { createLogger } from '@/lib/utils/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const logger = createLogger('OrdersImportAPI');

/**
 * POST /api/orders/import - Import orders from CSV
 */
export async function POST(request: NextRequest) {
  try {
    // Get user session for audit
    const session = await getServerSession(authOptions);
    const user = session?.user ? {
      id: (session.user as any).dbUserId as number | undefined,
      email: session.user.email || undefined,
      name: session.user.name || undefined,
    } : undefined;

    // Parse the request body
    const contentType = request.headers.get('content-type') || '';
    let rows: any[] = [];
    let fileName = 'import.csv';

    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await request.formData();
      const file = formData.get('file') as File;
      
      if (!file) {
        return NextResponse.json(
          { message: 'No file provided' },
          { status: 400 }
        );
      }

      fileName = file.name;
      const content = await file.text();
      rows = ImportExportService.parseCSV(content);
    } else {
      // Handle JSON body with parsed data
      const body = await request.json();
      
      if (body.csv) {
        rows = ImportExportService.parseCSV(body.csv);
      } else if (Array.isArray(body.data)) {
        rows = body.data;
      } else {
        return NextResponse.json(
          { message: 'Invalid request body. Provide either "csv" string or "data" array.' },
          { status: 400 }
        );
      }
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { message: 'No data to import' },
        { status: 400 }
      );
    }

    // Create import job
    const job = await ImportExportService.createJob({
      jobType: 'import',
      entityType: 'orders',
      fileName,
      totalRecords: rows.length,
      userId: user?.id,
      userEmail: user?.email,
    });

    // Process import
    const result = await ImportExportService.importOrders(rows, job.id, user);

    // Log audit
    await AuditLog.create({
      entityType: 'order',
      entityId: 0, // Bulk operation
      action: 'bulk_import',
      userId: user?.id,
      userEmail: user?.email,
      userName: user?.name,
      metadata: {
        jobId: job.id,
        totalRecords: rows.length,
        successCount: result.successCount,
        errorCount: result.errorCount,
      },
    });

    logger.info('Orders import completed', {
      jobId: job.id,
      total: rows.length,
      success: result.successCount,
      errors: result.errorCount,
    });

    return NextResponse.json({
      jobId: job.id,
      totalRecords: rows.length,
      successCount: result.successCount,
      errorCount: result.errorCount,
      errors: result.errors.slice(0, 50), // Limit errors in response
      hasMoreErrors: result.errors.length > 50,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to import orders';
    logger.error('POST /api/orders/import error', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}
