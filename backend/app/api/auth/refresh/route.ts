import { NextRequest, NextResponse } from 'next/server'
import { verifyRefreshToken } from '@/lib/auth/jwt'
import { generateAccessToken } from '@/lib/auth/jwt'

interface RefreshRequestBody {
  refreshToken?: string
}

/**
 * POST /api/auth/refresh
 *
 * Refresh Token으로 Access Token 재발급
 * - Refresh Token 검증 → 새 Access Token 발급
 * - Refresh Token은 그대로 유지 (rotation 없음)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: RefreshRequestBody = await request.json()

    // 1. 필수 필드 검증
    const { refreshToken } = body

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'refreshToken이 누락되었습니다.' },
        { status: 400 }
      )
    }

    // 2. Refresh Token 검증
    const payload = verifyRefreshToken(refreshToken)

    if (!payload) {
      return NextResponse.json(
        { error: '유효하지 않거나 만료된 Refresh Token입니다.' },
        { status: 401 }
      )
    }

    // 3. 타입 검증: 반드시 refresh 토큰이어야 함
    if (payload.type !== 'refresh') {
      return NextResponse.json(
        { error: '유효하지 않거나 만료된 Refresh Token입니다.' },
        { status: 401 }
      )
    }

    // 4. 새 Access Token 발급 (Refresh Token은 재발급 안 함)
    const accessToken = generateAccessToken({
      id: payload.userId,
      email: payload.email,
    })

    // 5. 응답 반환
    return NextResponse.json(
      {
        accessToken,
      },
      { status: 200 }
    )
  } catch (err) {
    // 예상치 못한 에러
    console.error('Refresh error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
