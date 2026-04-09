import { pool } from '@/lib/db/pool'
import { DatabaseError } from '@/lib/errors/databaseError'

export type JoinRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface JoinRequest {
  id: string
  team_id: string
  requester_id: string
  status: JoinRequestStatus
  requested_at: Date
  responded_at: Date | null
}

export interface JoinRequestWithDetail extends JoinRequest {
  team_name: string
  requester_name: string
  requester_email: string
}

export async function createJoinRequest(
  teamId: string,
  requesterId: string
): Promise<JoinRequest> {
  try {
    const result = await pool.query<JoinRequest>(
      `INSERT INTO team_join_requests (team_id, requester_id)
       VALUES ($1, $2)
       RETURNING id, team_id, requester_id, status, requested_at, responded_at`,
      [teamId, requesterId]
    )
    return result.rows[0]
  } catch (err) {
    // PG 에러 코드를 보존하여 DatabaseError로 래핑 (unique constraint 감지 등)
    const pgError = err as { code?: string; constraint?: string; detail?: string; message: string }
    throw new DatabaseError(
      pgError.message,
      pgError.code,
      pgError.constraint,
      pgError.detail
    )
  }
}

export async function getJoinRequestById(id: string): Promise<JoinRequest | null> {
  try {
    const result = await pool.query<JoinRequest>(
      `SELECT id, team_id, requester_id, status, requested_at, responded_at
       FROM team_join_requests
       WHERE id = $1`,
      [id]
    )
    return result.rows[0] ?? null
  } catch (err) {
    throw new Error(`getJoinRequestById 실패: ${(err as Error).message}`)
  }
}

export async function getPendingJoinRequestsByTeam(
  teamId: string
): Promise<JoinRequestWithDetail[]> {
  try {
    const result = await pool.query<JoinRequestWithDetail>(
      `SELECT jr.id, jr.team_id, jr.requester_id, jr.status, jr.requested_at, jr.responded_at,
              t.name AS team_name,
              u.name AS requester_name,
              u.email AS requester_email
       FROM team_join_requests jr
       JOIN teams t ON t.id = jr.team_id
       JOIN users u ON u.id = jr.requester_id
       WHERE jr.team_id = $1 AND jr.status = 'PENDING'
       ORDER BY jr.requested_at ASC`,
      [teamId]
    )
    return result.rows
  } catch (err) {
    throw new Error(`getPendingJoinRequestsByTeam 실패: ${(err as Error).message}`)
  }
}

export async function getPendingJoinRequestsByLeader(
  leaderId: string
): Promise<JoinRequestWithDetail[]> {
  try {
    // 해당 유저가 팀장인 모든 팀의 PENDING 가입 신청 조회 (/api/me/tasks 용)
    const result = await pool.query<JoinRequestWithDetail>(
      `SELECT jr.id, jr.team_id, jr.requester_id, jr.status, jr.requested_at, jr.responded_at,
              t.name AS team_name,
              u.name AS requester_name,
              u.email AS requester_email
       FROM team_join_requests jr
       JOIN teams t ON t.id = jr.team_id
       JOIN users u ON u.id = jr.requester_id
       WHERE t.leader_id = $1 AND jr.status = 'PENDING'
       ORDER BY jr.requested_at ASC`,
      [leaderId]
    )
    return result.rows
  } catch (err) {
    throw new Error(`getPendingJoinRequestsByLeader 실패: ${(err as Error).message}`)
  }
}

export async function updateJoinRequestStatus(
  id: string,
  status: 'APPROVED' | 'REJECTED'
): Promise<JoinRequest | null> {
  try {
    const result = await pool.query<JoinRequest>(
      `UPDATE team_join_requests
       SET status = $1, responded_at = now()
       WHERE id = $2
       RETURNING id, team_id, requester_id, status, requested_at, responded_at`,
      [status, id]
    )
    return result.rows[0] ?? null
  } catch (err) {
    throw new Error(`updateJoinRequestStatus 실패: ${(err as Error).message}`)
  }
}
