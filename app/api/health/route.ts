import { NextResponse } from 'next/server';

// Disable Next.js caching - use only Redis
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/health - Health check endpoint (no authentication required)
 */
export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
