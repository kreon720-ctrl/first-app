import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { withTeamRole } from '@/lib/middleware/withTeamRole'
import { getPostitById, updatePostitContent, deletePostit } from '@/lib/db/queries/postitQueries'

/**
 * PATCH /api/teams/:teamId/postits/:postitId
 * 포스트잇 내용 수정 (생성자만)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; postitId: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await withAuth(request)
    if (!authResult.success) return authResult.response

    const { teamId, postitId } = await params

    const roleResult = await withTeamRole(authResult.user.userId, teamId)
    if (!roleResult.success) return roleResult.response

    const existing = await getPostitById(teamId, postitId)
    if (!existing) {
      return NextResponse.json({ error: '포스트잇을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (existing.created_by !== authResult.user.userId) {
      return NextResponse.json({ error: '포스트잇 생성자만 수정할 수 있습니다.' }, { status: 403 })
    }

    const body = await request.json()
    const { content } = body

    if (typeof content !== 'string') {
      return NextResponse.json({ error: 'content는 문자열이어야 합니다.' }, { status: 400 })
    }

    const updated = await updatePostitContent(teamId, postitId, content)
    if (!updated) {
      return NextResponse.json({ error: '포스트잇 수정에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({
      id: updated.id,
      teamId: updated.team_id,
      createdBy: updated.created_by,
      date: updated.date,
      color: updated.color,
      content: updated.content,
      updatedAt: updated.updated_at,
    })
  } catch (err) {
    console.error('Update postit error:', err)
    return NextResponse.json({ error: '서버 내부 오류가 발생했습니다.' }, { status: 500 })
  }
}

/**
 * DELETE /api/teams/:teamId/postits/:postitId
 * 포스트잇 삭제 (생성자만)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; postitId: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await withAuth(request)
    if (!authResult.success) return authResult.response

    const { teamId, postitId } = await params

    const roleResult = await withTeamRole(authResult.user.userId, teamId)
    if (!roleResult.success) return roleResult.response

    const existing = await getPostitById(teamId, postitId)
    if (!existing) {
      return NextResponse.json({ error: '포스트잇을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (existing.created_by !== authResult.user.userId) {
      return NextResponse.json({ error: '포스트잇 생성자만 삭제할 수 있습니다.' }, { status: 403 })
    }

    await deletePostit(teamId, postitId)
    return NextResponse.json({ message: '포스트잇이 삭제되었습니다.' })
  } catch (err) {
    console.error('Delete postit error:', err)
    return NextResponse.json({ error: '서버 내부 오류가 발생했습니다.' }, { status: 500 })
  }
}
