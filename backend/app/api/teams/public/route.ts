import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { getPublicTeams } from '@/lib/db/queries/teamQueries'

/**
 * GET /api/teams/public
 *
 * 공개 팀 목록 조회 (팀 탐색)
 * - 로그인한 모든 사용자 접근 가능
 * - 팀명 오름차순 정렬, 최대 100개
 * - 구성원 수 포함
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await withAuth(request)
    if (!authResult.success) return authResult.response

    const publicTeams = await getPublicTeams()

    return NextResponse.json({
      teams: publicTeams.map(team => ({
        id: team.id,
        name: team.name,
        description: team.description ?? null,
        leaderId: team.leader_id,
        leaderName: team.leader_name,
        memberCount: team.member_count,
        createdAt: team.created_at,
      })),
    })
  } catch (err) {
    console.error('Get public teams error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
