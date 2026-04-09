import { NextRequest, NextResponse } from 'next/server'
import { getUserByEmail } from '@/lib/db/queries/userQueries'
import { verifyPassword } from '@/lib/auth/password'
import { generateTokenPair } from '@/lib/auth/jwt'

interface LoginRequestBody {
  email?: string
  password?: string
}

/**
 * POST /api/auth/login
 *
 * 이메일과 비밀번호로 로그인
 * - 사용자 조회 → 비밀번호 검증 → 토큰 발급
 * - 인증 실패 시 401 반환
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: LoginRequestBody = await request.json()

    // 1. 필수 필드 검증
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: '필수 입력 항목이 누락되었습니다.' },
        { status: 400 }
      )
    }

    // 2. 사용자 조회
    const user = await getUserByEmail(email)

    if (!user) {
      return NextResponse.json(
        { error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      )
    }

    // 3. 비밀번호 검증
    const isValidPassword = await verifyPassword(password, user.password_hash)

    if (!isValidPassword) {
      return NextResponse.json(
        { error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      )
    }

    // 4. 토큰 발급
    const { accessToken, refreshToken } = generateTokenPair(user)

    // 5. 응답 반환 (password_hash 제외)
    return NextResponse.json(
      {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
      { status: 200 }
    )
  } catch (err) {
    // 예상치 못한 에러
    console.error('Login error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
