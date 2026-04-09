import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { withTeamRole } from '@/lib/middleware/withTeamRole'
import { getTeamById, getTeamMembers } from '@/lib/db/queries/teamQueries'

/**
 * GET /api/teams/:teamId
 *
 * 팀 상세 정보 조회
 * - 해당 팀 구성원만 접근 가능
 * - 구성원 목록 포함
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await withAuth(request)
    if (!authResult.success) return authResult.response

    const { teamId } = await params

    // 1. 팀 존재 확인
    const team = await getTeamById(teamId)
    if (!team) {
      return NextResponse.json(
        { error: '팀을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 2. 팀 멤버십 검증
    const roleResult = await withTeamRole(authResult.user.userId, teamId)
    if (!roleResult.success) return roleResult.response

    // 3. 구성원 목록 조회
    const members = await getTeamMembers(teamId)

    return NextResponse.json({
      id: team.id,
      name: team.name,
      leaderId: team.leader_id,
      myRole: roleResult.context.role,
      createdAt: team.created_at,
      members: members.map(member => ({
        userId: member.user_id,
        name: member.name,
        email: member.email,
        role: member.role,
        joinedAt: member.joined_at,
      })),
    })
  } catch (err) {
    console.error('Get team detail error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
