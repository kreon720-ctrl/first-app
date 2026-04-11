// Next.js Proxy - Auth route protection and redirects

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that should redirect to home if already authenticated
const authRoutes = ['/login', '/signup'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if user is authenticated by looking for auth cookie
  // Note: localStorage is not accessible in proxy; cookie-based detection used instead
  const hasAuthCookie = request.cookies.has('auth-initialized');

  // If authenticated and accessing auth routes (login/signup), redirect to home
  if (authRoutes.includes(pathname) && hasAuthCookie) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Protected routes auth validation handled client-side (localStorage tokens)
  return NextResponse.next();
}

// Configure which routes should be processed by this proxy
export const config = {
  matcher: ['/login', '/signup', '/teams/:path*', '/me/:path*'],
};
