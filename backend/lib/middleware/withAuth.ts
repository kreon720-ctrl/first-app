import { NextRequest, NextResponse } from 'next/server'
import { extractBearerToken, verifyAccessToken, JwtPayload } from '@/lib/auth/jwt'

export interface AuthenticatedRequest {
  userId: string
  userEmail: string
}

/**
 * Middleware to verify JWT authentication
 * 
 * Usage in API routes:
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const authResult = await withAuth(request)
 *   if (!authResult.success) return authResult.response
 *   
 *   const { userId } = authResult.user
 *   // ... protected logic
 * }
 * ```
 */
export async function withAuth(request: NextRequest): Promise<
  | { success: true; user: AuthenticatedRequest }
  | { success: false; response: NextResponse }
> {
  const authHeader = request.headers.get('authorization')
  const token = extractBearerToken(authHeader)

  if (!token) {
    return {
      success: false,
      response: NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      ),
    }
  }

  const payload = verifyAccessToken(token)

  if (!payload || payload.type !== 'access') {
    return {
      success: false,
      response: NextResponse.json(
        { error: '유효하지 않거나 만료된 토큰입니다.' },
        { status: 401 }
      ),
    }
  }

  return {
    success: true,
    user: {
      userId: payload.userId,
      userEmail: payload.email,
    },
  }
}

/**
 * Higher-order function wrapper for cleaner API route syntax
 * 
 * Usage:
 * ```typescript
 * export const GET = requireAuth(async (request, user) => {
 *   // user is guaranteed to be authenticated
 *   return NextResponse.json({ userId: user.userId })
 * })
 * ```
 */
export function requireAuth(
  handler: (request: NextRequest, user: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async function (request: NextRequest): Promise<NextResponse> {
    const authResult = await withAuth(request)
    
    if (!authResult.success) {
      return authResult.response
    }

    return handler(request, authResult.user)
  }
}
