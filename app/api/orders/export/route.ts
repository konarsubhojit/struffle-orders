import { NextRequest, NextResponse } from 'next/server';
import ImportExportService from '@/lib/services/importExportService';
import AuditLog from '@/lib/models/AuditLog';
import { createLogger } from '@/lib/utils/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const logger = createLogger('OrdersExportAPI');

// Column definitions for order export
const ORDER_EXPORT_COLUMNS = [
  { key: 'orderId', header: 'Order ID' },
  { key: 'orderFrom', header: 'Source' },
  { key: 'customerName', header: 'Customer Name' },
  { key: 'customerId', header: 'Customer ID' },
  { key: 'address', header: 'Address' },
  { key: 'totalPrice', header: 'Total Price' },
  { key: 'status', header: 'Status' },
  { key: 'paymentStatus', header: 'Payment Status' },
  { key: 'paidAmount', header: 'Paid Amount' },
  { key: 'confirmationStatus', header: 'Confirmation Status' },
  { key: 'priority', header: 'Priority' },
  { key: 'orderDate', header: 'Order Date' },
  { key: 'expectedDeliveryDate', header: 'Expected Delivery Date' },
  { key: 'deliveryStatus', header: 'Delivery Status' },
  { key: 'trackingId', header: 'Tracking ID' },
  { key: 'deliveryPartner', header: 'Delivery Partner' },
  { key: 'actualDeliveryDate', header: 'Actual Delivery Date' },
  { key: 'customerNotes', header: 'Customer Notes' },
  { key: 'itemCount', header: 'Item Count' },
  { key: 'items', header: 'Items' },
  { key: 'createdAt', header: 'Created At' },
];

/**
 * GET /api/orders/export - Export orders to CSV
 */
export async function GET(request: NextRequest) {
  try {
    // Get user session for audit
    const session = await getServerSession(authOptions);
    const user = session?.user ? {
      id: (session.user as any).dbUserId as number | undefined,
      email: session.user.email || undefined,
      name: session.user.name || undefined,
    } : undefined;

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');

    // Build filters
    const filters: {
      startDate?: Date;
      endDate?: Date;
      status?: string;
    } = {};

    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (status) filters.status = status;

    // Create export job
    const job = await ImportExportService.createJob({
      jobType: 'export',
      entityType: 'orders',
      userId: user?.id,
      userEmail: user?.email,
    });

    // Get export data
    const ordersData = await ImportExportService.exportOrders(filters);

    // Update job
    await ImportExportService.updateJob(job.id, {
      status: 'completed',
      processedRecords: ordersData.length,
      successCount: ordersData.length,
      startedAt: new Date(),
      completedAt: new Date(),
    });

    // Log audit
    await AuditLog.create({
      entityType: 'order',
      entityId: 0,
      action: 'bulk_export',
      userId: user?.id,
      userEmail: user?.email,
      userName: user?.name,
      metadata: {
        jobId: job.id,
        totalRecords: ordersData.length,
        format,
        filters,
      },
    });

    logger.info('Orders export completed', {
      jobId: job.id,
      total: ordersData.length,
      format,
    });

    if (format === 'json') {
      return NextResponse.json({
        jobId: job.id,
        totalRecords: ordersData.length,
        data: ordersData,
      });
    }

    // Generate CSV
    const csv = ImportExportService.generateCSV(ordersData, ORDER_EXPORT_COLUMNS);
    
    const fileName = `orders_export_${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to export orders';
    logger.error('GET /api/orders/export error', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}
