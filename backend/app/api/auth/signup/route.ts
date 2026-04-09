import { NextRequest, NextResponse } from 'next/server'
import { createUser, getUserByEmail } from '@/lib/db/queries/userQueries'
import { hashPassword, validatePasswordStrength } from '@/lib/auth/password'
import { generateTokenPair } from '@/lib/auth/jwt'
import { DatabaseError, withDbErrorHandling } from '@/lib/errors/databaseError'

interface SignupRequestBody {
  email?: string
  name?: string
  password?: string
}

/**
 * POST /api/auth/signup
 * 
 * 신규 사용자 회원가입
 * - 이메일, 이름, 비밀번호를 받아 계정 생성
 * - Access Token과 Refresh Token 발급
 * - 이메일 중복 시 409 반환
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: SignupRequestBody = await request.json()

    // 1. 필수 필드 검증
    const { email, name, password } = body

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: '필수 입력 항목이 누락되었습니다.' },
        { status: 400 }
      )
    }

    // 2. 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '이메일 형식이 올바르지 않습니다.' },
        { status: 400 }
      )
    }

    // 3. 이름 길이 검증
    if (name.length > 50) {
      return NextResponse.json(
        { error: '이름은 최대 50자까지 입력 가능합니다.' },
        { status: 400 }
      )
    }

    // 4. 비밀번호 강도 검증
    const passwordValidation = validatePasswordStrength(password)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.message },
        { status: 400 }
      )
    }

    // 5. 비밀번호 해싱
    const password_hash = await hashPassword(password)

    // 6. 사용자 생성 (중복 체크 포함)
    const user = await withDbErrorHandling(async () => {
      // 이메일 중복 체크
      const existingUser = await getUserByEmail(email)
      if (existingUser) {
        throw new DatabaseError(
          '이미 사용 중인 이메일입니다.',
          '23505',
          'uq_users_email'
        )
      }

      // 사용자 생성
      return createUser({
        email,
        name,
        password_hash,
      })
    })

    // 7. 토큰 발급
    const { accessToken, refreshToken } = generateTokenPair(user)

    // 8. 응답 반환 (password_hash 제외)
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
      { status: 201 }
    )
  } catch (err) {
    // 데이터베이스 에러 처리
    if (err instanceof DatabaseError) {
      if (err.isUniqueViolation()) {
        return NextResponse.json(
          { error: err.message },
          { status: 409 }
        )
      }
    }

    // 예상치 못한 에러
    console.error('Signup error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
