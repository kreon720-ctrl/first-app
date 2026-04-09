import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { requireLeader } from '@/lib/middleware/withTeamRole'
import {
  createJoinRequest,
  getPendingJoinRequestsByTeam,
} from '@/lib/db/queries/joinRequestQueries'
import { getTeamById, getUserTeamRole } from '@/lib/db/queries/teamQueries'
import { DatabaseError } from '@/lib/errors/databaseError'

/**
 * POST /api/teams/:teamId/join-requests
 *
 * 팀 가입 신청 제출
 * - PENDING 상태로 TeamJoinRequest 생성
 * - 중복 신청 방지 (이미 구성원이거나 PENDING 신청 존재 시 409)
 */
export async function POST(
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

    // 2. 이미 팀 구성원인지 확인 (FR-02-4)
    const existingRole = await getUserTeamRole(teamId, authResult.user.userId)
    if (existingRole) {
      return NextResponse.json(
        { error: '이미 해당 팀의 구성원입니다.' },
        { status: 409 }
      )
    }

    // 3. 가입 신청 생성 (PENDING 중복은 DB unique index로 감지)
    try {
      const joinRequest = await createJoinRequest(teamId, authResult.user.userId)

      return NextResponse.json(
        {
          id: joinRequest.id,
          teamId: joinRequest.team_id,
          teamName: team.name,
          requesterId: joinRequest.requester_id,
          status: joinRequest.status,
          requestedAt: joinRequest.requested_at,
          respondedAt: joinRequest.responded_at,
        },
        { status: 201 }
      )
    } catch (err) {
      if (err instanceof DatabaseError) {
        if (err.isUniqueViolation()) {
          // PENDING 중복 신청 방지 (idx_team_join_requests_pending_unique)
          return NextResponse.json(
            { error: '이미 가입 신청이 진행 중입니다.' },
            { status: 409 }
          )
        }
      }
      throw err
    }
  } catch (err) {
    console.error('Create join request error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/teams/:teamId/join-requests
 *
 * 팀의 PENDING 가입 신청 목록 조회
 * - 팀장(LEADER)만 접근 가능
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

    // 2. 팀장 권한 검증
    const leaderResult = await requireLeader(authResult.user.userId, teamId)
    if (!leaderResult.success) return leaderResult.response

    // 3. PENDING 가입 신청 목록 조회
    const joinRequests = await getPendingJoinRequestsByTeam(teamId)

    return NextResponse.json({
      teamId,
      teamName: team.name,
      joinRequests: joinRequests.map(jr => ({
        id: jr.id,
        requesterId: jr.requester_id,
        requesterName: jr.requester_name,
        requesterEmail: jr.requester_email,
        status: jr.status,
        requestedAt: jr.requested_at,
        respondedAt: jr.responded_at,
      })),
    })
  } catch (err) {
    console.error('Get join requests error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
