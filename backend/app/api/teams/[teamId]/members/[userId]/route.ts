import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { requireLeader } from '@/lib/middleware/withTeamRole'
import { removeTeamMember, getTeamById } from '@/lib/db/queries/teamQueries'

/**
 * DELETE /api/teams/:teamId/members/:userId
 * 팀원 강제 탈퇴 (팀장 전용)
 * - 팀장 본인은 제거 불가
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; userId: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await withAuth(request)
    if (!authResult.success) return authResult.response

    const { teamId, userId } = await params

    // 1. 팀장 권한 확인
    const leaderResult = await requireLeader(authResult.user.userId, teamId)
    if (!leaderResult.success) return leaderResult.response

    // 2. 팀장 본인 제거 방지
    const team = await getTeamById(teamId)
    if (team?.leader_id === userId) {
      return NextResponse.json(
        { error: '팀장은 탈퇴시킬 수 없습니다.' },
        { status: 400 }
      )
    }

    // 3. 팀원 제거
    const removed = await removeTeamMember(teamId, userId)
    if (!removed) {
      return NextResponse.json(
        { error: '해당 팀원을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: '팀원이 탈퇴 처리되었습니다.' })
  } catch (err) {
    console.error('Remove team member error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
