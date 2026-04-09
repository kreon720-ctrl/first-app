import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { getPendingJoinRequestsByLeader } from '@/lib/db/queries/joinRequestQueries'

/**
 * GET /api/me/tasks
 *
 * 나의 할 일 조회
 * - 내가 LEADER인 팀들의 PENDING 가입 신청 전체 조회
 * - MEMBER만인 사용자는 빈 배열 반환
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await withAuth(request)
    if (!authResult.success) return authResult.response

    // 내가 LEADER인 팀들의 PENDING 가입 신청 조회
    const tasks = await getPendingJoinRequestsByLeader(authResult.user.userId)

    return NextResponse.json({
      totalPendingCount: tasks.length,
      tasks: tasks.map(task => ({
        id: task.id,
        teamId: task.team_id,
        teamName: task.team_name,
        requesterId: task.requester_id,
        requesterName: task.requester_name,
        requesterEmail: task.requester_email,
        status: task.status,
        requestedAt: task.requested_at,
        respondedAt: task.responded_at,
      })),
    })
  } catch (err) {
    console.error('Get my tasks error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
