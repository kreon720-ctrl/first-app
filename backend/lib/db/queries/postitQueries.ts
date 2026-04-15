import { pool } from '@/lib/db/pool'

export interface Postit {
  id: string
  team_id: string
  created_by: string
  creator_name: string | null
  date: string          // DATE → 'YYYY-MM-DD'
  color: string
  content: string
  created_at: Date
  updated_at: Date
}

export interface CreatePostitParams {
  teamId: string
  createdBy: string
  date: string   // 'YYYY-MM-DD' (KST)
  color: string
}

export async function createPostit(params: CreatePostitParams): Promise<Postit> {
  const { teamId, createdBy, date, color } = params
  const result = await pool.query<Postit>(
    `INSERT INTO postits (team_id, created_by, date, color)
     VALUES ($1, $2, $3, $4)
     RETURNING id, team_id, created_by, NULL AS creator_name, date::text, color, content, created_at, updated_at`,
    [teamId, createdBy, date, color]
  )
  return result.rows[0]
}

export async function getPostitsByMonth(teamId: string, month: string): Promise<Postit[]> {
  // month: 'YYYY-MM'
  const result = await pool.query<Postit>(
    `SELECT p.id, p.team_id, p.created_by, u.name AS creator_name,
            p.date::text, p.color, p.content, p.created_at, p.updated_at
     FROM postits p
     LEFT JOIN users u ON u.id = p.created_by
     WHERE p.team_id = $1
       AND to_char(p.date, 'YYYY-MM') = $2
     ORDER BY p.date ASC, p.created_at ASC`,
    [teamId, month]
  )
  return result.rows
}

export async function getPostitById(teamId: string, postitId: string): Promise<Postit | null> {
  const result = await pool.query<Postit>(
    `SELECT p.id, p.team_id, p.created_by, u.name AS creator_name,
            p.date::text, p.color, p.content, p.created_at, p.updated_at
     FROM postits p
     LEFT JOIN users u ON u.id = p.created_by
     WHERE p.team_id = $1 AND p.id = $2`,
    [teamId, postitId]
  )
  return result.rows[0] ?? null
}

export async function updatePostitContent(
  teamId: string,
  postitId: string,
  content: string
): Promise<Postit | null> {
  const result = await pool.query<Postit>(
    `UPDATE postits
     SET content = $3, updated_at = now()
     WHERE team_id = $1 AND id = $2
     RETURNING id, team_id, created_by, NULL AS creator_name, date::text, color, content, created_at, updated_at`,
    [teamId, postitId, content]
  )
  return result.rows[0] ?? null
}

export async function deletePostit(teamId: string, postitId: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM postits WHERE team_id = $1 AND id = $2`,
    [teamId, postitId]
  )
  return (result.rowCount ?? 0) > 0
}
