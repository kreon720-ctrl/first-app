import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { withTeamRole, requireLeader } from '@/lib/middleware/withTeamRole'
import { getWorkPermissions, setWorkPermissions } from '@/lib/db/queries/permissionQueries'

/**
 * GET /api/teams/:teamId/work-permissions
 * 팀의 업무실적 조회 권한 목록 반환 (팀 멤버 전용)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await withAuth(request)
    if (!authResult.success) return authResult.response

    const { teamId } = await params

    const roleResult = await withTeamRole(authResult.user.userId, teamId)
    if (!roleResult.success) return roleResult.response

    const permittedUserIds = await getWorkPermissions(teamId)

    return NextResponse.json({ permittedUserIds })
  } catch (err) {
    console.error('Get work permissions error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/teams/:teamId/work-permissions
 * 팀의 업무실적 조회 권한 일괄 설정 (팀장 전용)
 * body: { userIds: string[] }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await withAuth(request)
    if (!authResult.success) return authResult.response

    const { teamId } = await params

    // 팀장만 권한 설정 가능
    const leaderResult = await requireLeader(authResult.user.userId, teamId)
    if (!leaderResult.success) return leaderResult.response

    const body = await request.json()
    const { userIds } = body

    if (!Array.isArray(userIds)) {
      return NextResponse.json(
        { error: 'userIds는 배열이어야 합니다.' },
        { status: 400 }
      )
    }

    await setWorkPermissions(teamId, userIds)

    return NextResponse.json({ permittedUserIds: userIds })
  } catch (err) {
    console.error('Set work permissions error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
