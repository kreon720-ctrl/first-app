import { pool } from '@/lib/db/pool'

/**
 * 팀의 업무실적 조회 권한 목록 조회 (허용된 user_id 배열 반환)
 */
export async function getWorkPermissions(teamId: string): Promise<string[]> {
  const result = await pool.query<{ user_id: string }>(
    `SELECT user_id FROM work_performance_permissions WHERE team_id = $1`,
    [teamId]
  )
  return result.rows.map(r => r.user_id)
}

/**
 * 팀의 업무실적 조회 권한 일괄 설정 (기존 권한 전부 교체)
 * userIds: 권한을 부여할 user_id 배열 (빈 배열이면 전체 해제)
 */
export async function setWorkPermissions(
  teamId: string,
  userIds: string[]
): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    // 기존 권한 전부 삭제
    await client.query(
      `DELETE FROM work_performance_permissions WHERE team_id = $1`,
      [teamId]
    )
    // 새 권한 삽입
    if (userIds.length > 0) {
      const values = userIds
        .map((uid, i) => `($1, $${i + 2})`)
        .join(', ')
      await client.query(
        `INSERT INTO work_performance_permissions (team_id, user_id) VALUES ${values}`,
        [teamId, ...userIds]
      )
    }
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw new Error(`setWorkPermissions 실패: ${(err as Error).message}`)
  } finally {
    client.release()
  }
}

/**
 * 특정 사용자가 해당 팀의 업무실적 메시지를 볼 권한이 있는지 확인
 */
export async function hasWorkPermission(
  teamId: string,
  userId: string
): Promise<boolean> {
  const result = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS(
       SELECT 1 FROM work_performance_permissions
       WHERE team_id = $1 AND user_id = $2
     ) AS exists`,
    [teamId, userId]
  )
  return result.rows[0]?.exists ?? false
}
