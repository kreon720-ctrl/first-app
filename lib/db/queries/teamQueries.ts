import { pool } from '@/lib/db/pool'

export interface Team {
  id: string
  name: string
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

export async function createTeam(name: string, leaderId: string): Promise<Team> {
  try {
    const result = await pool.query<Team>(
      `INSERT INTO teams (name, leader_id)
       VALUES ($1, $2)
       RETURNING id, name, leader_id, created_at`,
      [name, leaderId]
    )
    return result.rows[0]
  } catch (err) {
    throw new Error(`createTeam 실패: ${(err as Error).message}`)
  }
}

export async function getTeamById(teamId: string): Promise<Team | null> {
  try {
    const result = await pool.query<Team>(
      `SELECT id, name, leader_id, created_at
       FROM teams
       WHERE id = $1`,
      [teamId]
    )
    return result.rows[0] ?? null
  } catch (err) {
    throw new Error(`getTeamById 실패: ${(err as Error).message}`)
  }
}

export async function getPublicTeams(): Promise<Team[]> {
  try {
    const result = await pool.query<Team>(
      `SELECT id, name, leader_id, created_at
       FROM teams
       ORDER BY created_at DESC`
    )
    return result.rows
  } catch (err) {
    throw new Error(`getPublicTeams 실패: ${(err as Error).message}`)
  }
}

export async function getUserTeams(userId: string): Promise<TeamWithRole[]> {
  try {
    const result = await pool.query<TeamWithRole>(
      `SELECT t.id, t.name, t.leader_id, t.created_at, tm.role
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
