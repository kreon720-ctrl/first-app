import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { updateUserName } from '@/lib/db/queries/userQueries'

/**
 * PATCH /api/me
 * 내 프로필 수정 (현재: 이름 변경)
 * body: { name: string }
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await withAuth(request)
    if (!authResult.success) return authResult.response

    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: '이름은 필수입니다.' },
        { status: 400 }
      )
    }

    const trimmed = name.trim()
    if (trimmed.length > 50) {
      return NextResponse.json(
        { error: '이름은 최대 50자까지 입력 가능합니다.' },
        { status: 400 }
      )
    }

    const updated = await updateUserName(authResult.user.userId, trimmed)
    if (!updated) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: updated.id,
      email: updated.email,
      name: updated.name,
    })
  } catch (err) {
    console.error('Update profile error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
