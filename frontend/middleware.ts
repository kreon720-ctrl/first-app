// Next.js Middleware - Auth route protection and redirects

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that don't require authentication
const publicRoutes = ['/login', '/signup'];

// Routes that should redirect to home if already authenticated
const authRoutes = ['/login', '/signup'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if user is authenticated by looking for accessToken in cookies or localStorage
  // Note: Since we use localStorage for tokens, middleware can't access it directly
  // We'll use a cookie-based approach for middleware detection
  const hasAuthCookie = request.cookies.has('auth-initialized');

  // If user is authenticated and trying to access auth routes (login/signup), redirect to home
  if (authRoutes.includes(pathname) && hasAuthCookie) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // For protected routes, we'll handle auth check on client side
  // Middleware can't access localStorage, so we rely on cookie presence
  // The actual auth validation happens in the API layer and client-side guards

  return NextResponse.next();
}

// Configure which routes should be processed by this middleware
export const config = {
  matcher: ['/login', '/signup', '/teams/:path*', '/me/:path*'],
};
