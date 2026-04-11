import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { withTeamRole, requireLeader } from '@/lib/middleware/withTeamRole'
import {
  getSchedulesByDateRange,
  createSchedule,
} from '@/lib/db/queries/scheduleQueries'
import { getTeamById } from '@/lib/db/queries/teamQueries'
import { getKstDateRange, CalendarView } from '@/lib/utils/timezone'

interface CreateScheduleBody {
  title?: string
  description?: string
  startAt?: string
  endAt?: string
}

/**
 * GET /api/teams/:teamId/schedules
 *
 * 일정 목록 조회 (월/주/일 뷰)
 * - teamId 기반 팀 격리
 * - view(month/week/day) + date 파라미터로 KST 기준 범위 조회
 * - 기본값: view=month, date=오늘
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await withAuth(request)
    if (!authResult.success) return authResult.response

    const { teamId } = await params

    // 1. 팀 멤버십 검증
    const roleResult = await withTeamRole(authResult.user.userId, teamId)
    if (!roleResult.success) return roleResult.response

    // 2. 쿼리 파라미터 파싱
    const searchParams = request.nextUrl.searchParams
    const rawView = searchParams.get('view') || 'month'
    const validViews: CalendarView[] = ['month', 'week', 'day']
    if (!validViews.includes(rawView as CalendarView)) {
      return NextResponse.json(
        { error: 'view는 month, week, day 중 하나여야 합니다.' },
        { status: 400 }
      )
    }
    const view = rawView as CalendarView
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    // 3. KST 날짜 범위 계산
    const { start, end } = getKstDateRange(view, date)

    // 4. 일정 조회
    const schedules = await getSchedulesByDateRange(teamId, start, end)

    return NextResponse.json({
      schedules: schedules.map(schedule => ({
        id: schedule.id,
        teamId: schedule.team_id,
        title: schedule.title,
        description: schedule.description,
        startAt: schedule.start_at,
        endAt: schedule.end_at,
        createdBy: schedule.created_by,
        createdAt: schedule.created_at,
        updatedAt: schedule.updated_at,
      })),
      view,
      date,
    })
  } catch (err) {
    console.error('Get schedules error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/teams/:teamId/schedules
 *
 * 일정 생성 (모든 팀원)
 * - title 필수, startAt/endAt 필수
 * - startAt < endAt 검증
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await withAuth(request)
    if (!authResult.success) return authResult.response

    const { teamId } = await params

    // 1. 팀 멤버십 검증
    const roleResult = await withTeamRole(authResult.user.userId, teamId)
    if (!roleResult.success) return roleResult.response

    // 2. 요청 본문 파싱 및 검증
    const body: CreateScheduleBody = await request.json()
    const { title, description, startAt, endAt } = body

    // 필수 필드 검증
    if (!title) {
      return NextResponse.json(
        { error: '제목은 필수입니다.' },
        { status: 400 }
      )
    }

    if (title.length > 200) {
      return NextResponse.json(
        { error: '제목은 최대 200자까지 입력 가능합니다.' },
        { status: 400 }
      )
    }

    if (!startAt || !endAt) {
      return NextResponse.json(
        { error: '시작일과 종료일은 필수입니다.' },
        { status: 400 }
      )
    }

    // 날짜 유효성 검증
    const startDate = new Date(startAt)
    const endDate = new Date(endAt)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: '날짜 형식이 올바르지 않습니다.' },
        { status: 400 }
      )
    }

    if (endDate <= startDate) {
      return NextResponse.json(
        { error: '종료일은 시작일보다 늦어야 합니다.' },
        { status: 400 }
      )
    }

    // 3. 일정 생성
    const schedule = await createSchedule({
      teamId,
      createdBy: authResult.user.userId,
      title,
      description: description ?? null,
      startAt: startDate,
      endAt: endDate,
    })

    return NextResponse.json(
      {
        id: schedule.id,
        teamId: schedule.team_id,
        title: schedule.title,
        description: schedule.description,
        startAt: schedule.start_at,
        endAt: schedule.end_at,
        createdBy: schedule.created_by,
        createdAt: schedule.created_at,
        updatedAt: schedule.updated_at,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('Create schedule error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
