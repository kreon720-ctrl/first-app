// Next.js Proxy - CORS preflight (OPTIONS) handler for API routes

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': frontendUrl,
        'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
