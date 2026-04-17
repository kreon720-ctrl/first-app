import { pool } from '@/lib/db/pool'

export interface Team {
  id: string
  name: string
  description: string | null
  is_public: boolean
  leader_id: string
  created_at: Date
}

export interface TeamMember {
  team_id: string
  user_id: string
  role: 'LEADER' | 'MEMBER'
  created_at: Date
}

export interface TeamWithRole extends Team {
  role: 'LEADER' | 'MEMBER'
}

export interface PublicTeam extends Team {
  leader_name: string
  member_count: number
}

export interface TeamMemberDetail {
  user_id: string
  name: string
  email: string
  role: 'LEADER' | 'MEMBER'
  joined_at: Date
}

export async function createTeam(name: string, leaderId: string, description?: string): Promise<Team> {
  try {
    const result = await pool.query<Team>(
      `INSERT INTO teams (name, leader_id, description)
       VALUES ($1, $2, $3)
       RETURNING id, name, description, leader_id, created_at`,
      [name, leaderId, description ?? null]
    )
    return result.rows[0]
  } catch (err) {
    throw new Error(`createTeam 실패: ${(err as Error).message}`)
  }
}

export async function getTeamById(teamId: string): Promise<Team | null> {
  try {
    const result = await pool.query<Team>(
      `SELECT id, name, description, is_public, leader_id, created_at
       FROM teams
       WHERE id = $1`,
      [teamId]
    )
    return result.rows[0] ?? null
  } catch (err) {
    throw new Error(`getTeamById 실패: ${(err as Error).message}`)
  }
}

// GET /api/teams/public 용 — leaderName, memberCount 포함 (공개 팀만)
export async function getPublicTeams(): Promise<PublicTeam[]> {
  try {
    const result = await pool.query<PublicTeam>(
      `SELECT t.id, t.name, t.description, t.leader_id, t.created_at,
              u.name AS leader_name,
              COUNT(tm.user_id)::int AS member_count
       FROM teams t
       JOIN users u ON u.id = t.leader_id
       LEFT JOIN team_members tm ON tm.team_id = t.id
       WHERE t.is_public = true
       GROUP BY t.id, t.name, t.description, t.leader_id, t.created_at, u.name
       ORDER BY t.name ASC
       LIMIT 100`
    )
    return result.rows
  } catch (err) {
    throw new Error(`getPublicTeams 실패: ${(err as Error).message}`)
  }
}

// GET /api/teams/:teamId 용 — 팀 구성원 상세 목록
export async function getTeamMembers(teamId: string): Promise<TeamMemberDetail[]> {
  try {
    const result = await pool.query<TeamMemberDetail>(
      `SELECT u.id AS user_id, u.name, u.email, tm.role, tm.created_at AS joined_at
       FROM team_members tm
       JOIN users u ON u.id = tm.user_id
       WHERE tm.team_id = $1
       ORDER BY tm.created_at ASC`,
      [teamId]
    )
    return result.rows
  } catch (err) {
    throw new Error(`getTeamMembers 실패: ${(err as Error).message}`)
  }
}

export async function getUserTeams(userId: string): Promise<TeamWithRole[]> {
  try {
    const result = await pool.query<TeamWithRole>(
      `SELECT t.id, t.name, t.description, t.is_public, t.leader_id, t.created_at, tm.role
       FROM teams t
       JOIN team_members tm ON tm.team_id = t.id
       WHERE tm.user_id = $1
       ORDER BY t.created_at DESC`,
      [userId]
    )
    return result.rows
  } catch (err) {
    throw new Error(`getUserTeams 실패: ${(err as Error).message}`)
  }
}

export async function addTeamMember(
  teamId: string,
  userId: string,
  role: 'LEADER' | 'MEMBER'
): Promise<TeamMember> {
  try {
    const result = await pool.query<TeamMember>(
      `INSERT INTO team_members (team_id, user_id, role)
       VALUES ($1, $2, $3)
       RETURNING team_id, user_id, role, created_at`,
      [teamId, userId, role]
    )
    return result.rows[0]
  } catch (err) {
    throw new Error(`addTeamMember 실패: ${(err as Error).message}`)
  }
}

export async function removeTeamMember(
  teamId: string,
  userId: string
): Promise<boolean> {
  try {
    const result = await pool.query(
      `DELETE FROM team_members WHERE team_id = $1 AND user_id = $2`,
      [teamId, userId]
    )
    return (result.rowCount ?? 0) > 0
  } catch (err) {
    throw new Error(`removeTeamMember 실패: ${(err as Error).message}`)
  }
}

export async function getUserTeamRole(
  teamId: string,
  userId: string
): Promise<'LEADER' | 'MEMBER' | null> {
  try {
    const result = await pool.query<{ role: 'LEADER' | 'MEMBER' }>(
      `SELECT role
       FROM team_members
       WHERE team_id = $1 AND user_id = $2`,
      [teamId, userId]
    )
    return result.rows[0]?.role ?? null
  } catch (err) {
    throw new Error(`getUserTeamRole 실패: ${(err as Error).message}`)
  }
}

export interface UpdateTeamParams {
  name?: string
  description?: string
  isPublic?: boolean
}

export async function updateTeam(
  teamId: string,
  params: UpdateTeamParams
): Promise<Team | null> {
  const { name, description, isPublic } = params
  try {
    const result = await pool.query<Team>(
      `UPDATE teams
       SET name        = COALESCE($2, name),
           description = CASE WHEN $3::boolean THEN $4 ELSE description END,
           is_public   = COALESCE($5, is_public)
       WHERE id = $1
       RETURNING id, name, description, is_public, leader_id, created_at`,
      [
        teamId,
        name ?? null,
        'description' in params,
        description ?? null,
        isPublic,
      ]
    )
    return result.rows[0] ?? null
  } catch (err) {
    throw new Error(`updateTeam 실패: ${(err as Error).message}`)
  }
}

export async function deleteTeam(teamId: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `DELETE FROM teams WHERE id = $1`,
      [teamId]
    )
    return (result.rowCount ?? 0) > 0
  } catch (err) {
    throw new Error(`deleteTeam 실패: ${(err as Error).message}`)
  }
}
