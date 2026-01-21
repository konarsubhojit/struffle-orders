import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Wrapper to add authentication to Next.js API routes
 * Uses NextAuth session for authentication
 */
export async function withAuth(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  options: { required?: boolean } = { required: true }
) {
  return async (request: NextRequest, context?: any) => {
    const session = await getServerSession(authOptions);

    if (options.required && !session) {
      return NextResponse.json(
        { message: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    // Add session to request context if available
    if (session) {
      // @ts-ignore - Adding session to request
      request.session = session;
    }

    return handler(request, context);
  };
}

/**
 * Check if authentication is disabled (for development)
 */
export function isAuthDisabled(): boolean {
  return process.env.AUTH_DISABLED === 'true' && process.env.NODE_ENV !== 'production';
}

/**
 * Get user from request session
 */
export async function getUserFromRequest(request: NextRequest) {
  const session = await getServerSession(authOptions);
  return session?.user || null;
}
