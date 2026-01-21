import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Next.js proxy to protect API routes
 * This runs before API route handlers
 */
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip authentication for public routes
  const publicRoutes = [
    '/api/health',
    '/api/public/',
    '/api/auth/',
  ];

  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Check if auth is disabled for development
  if (process.env.AUTH_DISABLED === 'true' && process.env.NODE_ENV !== 'production') {
    console.log('[Auth] AUTH_DISABLED is true - skipping authentication');
    return NextResponse.next();
  }

  // Check for valid session token
  const token = await getToken({ req: request });

  if (!token && pathname.startsWith('/api/')) {
    return NextResponse.json(
      { message: 'Unauthorized - Authentication required' },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

/**
 * Configure which routes this proxy applies to
 */
export const config = {
  matcher: [
    '/api/:path*',
  ],
};
