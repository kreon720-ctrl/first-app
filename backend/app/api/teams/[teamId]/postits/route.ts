import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { withTeamRole } from '@/lib/middleware/withTeamRole'
import { createPostit, getPostitsByMonth } from '@/lib/db/queries/postitQueries'

/**
 * GET /api/teams/:teamId/postits?month=YYYY-MM
 * 해당 월의 포스트잇 목록 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await withAuth(request)
    if (!authResult.success) return authResult.response

    const { teamId } = await params

    const roleResult = await withTeamRole(authResult.user.userId, teamId)
    if (!roleResult.success) return roleResult.response

    const month = request.nextUrl.searchParams.get('month')
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: 'month 파라미터가 필요합니다. (YYYY-MM)' }, { status: 400 })
    }

    const postits = await getPostitsByMonth(teamId, month)
    return NextResponse.json({
      postits: postits.map(p => ({
        id: p.id,
        teamId: p.team_id,
        createdBy: p.created_by,
        creatorName: p.creator_name,
        date: p.date,
        color: p.color,
        content: p.content,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      })),
    })
  } catch (err) {
    console.error('Get postits error:', err)
    return NextResponse.json({ error: '서버 내부 오류가 발생했습니다.' }, { status: 500 })
  }
}

/**
 * POST /api/teams/:teamId/postits
 * 포스트잇 생성
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await withAuth(request)
    if (!authResult.success) return authResult.response

    const { teamId } = await params

    const roleResult = await withTeamRole(authResult.user.userId, teamId)
    if (!roleResult.success) return roleResult.response

    const body = await request.json()
    const { date, color } = body

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'date 파라미터가 필요합니다. (YYYY-MM-DD)' }, { status: 400 })
    }

    const validColors = ['indigo', 'blue', 'emerald', 'amber', 'rose']
    if (!color || !validColors.includes(color)) {
      return NextResponse.json({ error: '유효하지 않은 색상입니다.' }, { status: 400 })
    }

    const postit = await createPostit({
      teamId,
      createdBy: authResult.user.userId,
      date,
      color,
    })

    return NextResponse.json({
      id: postit.id,
      teamId: postit.team_id,
      createdBy: postit.created_by,
      creatorName: postit.creator_name,
      date: postit.date,
      color: postit.color,
      content: postit.content,
      createdAt: postit.created_at,
      updatedAt: postit.updated_at,
    }, { status: 201 })
  } catch (err) {
    console.error('Create postit error:', err)
    return NextResponse.json({ error: '서버 내부 오류가 발생했습니다.' }, { status: 500 })
  }
}
