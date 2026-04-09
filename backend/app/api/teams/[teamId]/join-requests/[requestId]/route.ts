import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { requireLeader } from '@/lib/middleware/withTeamRole'
import {
  getJoinRequestById,
  updateJoinRequestStatus,
  JoinRequest,
} from '@/lib/db/queries/joinRequestQueries'
import { getTeamById } from '@/lib/db/queries/teamQueries'
import { pool } from '@/lib/db/pool'

interface PatchJoinRequestBody {
  action?: 'APPROVE' | 'REJECT'
}

/**
 * PATCH /api/teams/:teamId/join-requests/:requestId
 *
 * 가입 신청 승인/거절
 * - 팀장(LEADER)만 처리 가능
 * - APPROVE 시: 팀 멤버로 등록 + 상태 변경 (원자적 처리)
 * - REJECT 시: 상태만 변경
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; requestId: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await withAuth(request)
    if (!authResult.success) return authResult.response

    const { teamId, requestId } = await params
    const body: PatchJoinRequestBody = await request.json()
    const { action } = body

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

    // 3. action 검증
    if (!action) {
      return NextResponse.json(
        { error: 'action은 필수입니다.' },
        { status: 400 }
      )
    }

    if (action !== 'APPROVE' && action !== 'REJECT') {
      return NextResponse.json(
        { error: 'action은 APPROVE 또는 REJECT이어야 합니다.' },
        { status: 400 }
      )
    }

    // 4. 가입 신청 조회
    const joinRequest = await getJoinRequestById(requestId)
    if (!joinRequest || joinRequest.team_id !== teamId) {
      return NextResponse.json(
        { error: '가입 신청을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 5. 이미 처리된 신청인지 확인
    if (joinRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: '이미 처리된 가입 신청입니다.' },
        { status: 400 }
      )
    }

    // 6. 승인/거절 처리 (APPROVE 시 트랜잭션으로 원자적 처리)
    let updatedRequest: JoinRequest | null

    if (action === 'APPROVE') {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const updateResult = await client.query<JoinRequest>(
          `UPDATE team_join_requests
           SET status = 'APPROVED', responded_at = now()
           WHERE id = $1
           RETURNING id, team_id, requester_id, status, requested_at, responded_at`,
          [requestId]
        )
        updatedRequest = updateResult.rows[0] ?? null
        await client.query(
          `INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3)`,
          [teamId, joinRequest.requester_id, 'MEMBER']
        )
        await client.query('COMMIT')
      } catch (txErr) {
        await client.query('ROLLBACK')
        throw txErr
      } finally {
        client.release()
      }
    } else {
      updatedRequest = await updateJoinRequestStatus(requestId, 'REJECTED')
    }

    return NextResponse.json({
      id: updatedRequest!.id,
      teamId: updatedRequest!.team_id,
      teamName: team.name,
      requesterId: updatedRequest!.requester_id,
      status: updatedRequest!.status,
      requestedAt: updatedRequest!.requested_at,
      respondedAt: updatedRequest!.responded_at,
    })
  } catch (err) {
    console.error('Update join request error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
