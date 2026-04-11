import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import {
  getUserTeams,
  createTeam,
} from '@/lib/db/queries/teamQueries'
import { pool } from '@/lib/db/pool'

interface CreateTeamBody {
  name?: string
  description?: string
  isPublic?: boolean
}

/**
 * GET /api/teams
 *
 * 현재 사용자가 속한 팀 목록 조회
 * - 각 팀의 내 역할(myRole) 포함
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await withAuth(request)
    if (!authResult.success) return authResult.response

    const teams = await getUserTeams(authResult.user.userId)

    return NextResponse.json({
      teams: teams.map(team => ({
        id: team.id,
        name: team.name,
        description: team.description ?? null,
        isPublic: team.is_public,
        leaderId: team.leader_id,
        myRole: team.role,
        createdAt: team.created_at,
      })),
    })
  } catch (err) {
    console.error('Get teams error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/teams
 *
 * 새 팀 생성
 * - 생성자는 자동으로 LEADER로 등록됨
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await withAuth(request)
    if (!authResult.success) return authResult.response

    const body: CreateTeamBody = await request.json()
    const { name, description } = body

    // 1. 팀 이름 검증
    if (!name) {
      return NextResponse.json(
        { error: '팀 이름은 필수입니다.' },
        { status: 400 }
      )
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: '팀 이름은 최대 100자까지 입력 가능합니다.' },
        { status: 400 }
      )
    }

    if (description && description.length > 500) {
      return NextResponse.json(
        { error: '팀 업무 설명은 최대 500자까지 입력 가능합니다.' },
        { status: 400 }
      )
    }

    // 2. 팀 생성 및 리더 등록 (트랜잭션)
    const client = await pool.connect()
    let team: Awaited<ReturnType<typeof createTeam>>
    try {
      await client.query('BEGIN')
      const teamResult = await client.query<{ id: string; name: string; description: string | null; is_public: boolean; leader_id: string; created_at: Date }>(
        `INSERT INTO teams (name, leader_id, description, is_public) VALUES ($1, $2, $3, $4) RETURNING id, name, description, is_public, leader_id, created_at`,
        [name, authResult.user.userId, description ?? null, body.isPublic ?? false]
      )
      team = teamResult.rows[0]
      await client.query(
        `INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3)`,
        [team.id, authResult.user.userId, 'LEADER']
      )
      await client.query('COMMIT')
    } catch (txErr) {
      await client.query('ROLLBACK')
      throw txErr
    } finally {
      client.release()
    }

    return NextResponse.json(
      {
        id: team.id,
        name: team.name,
        description: team.description ?? null,
        isPublic: team.is_public,
        leaderId: team.leader_id,
        myRole: 'LEADER' as const,
        createdAt: team.created_at,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('Create team error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
