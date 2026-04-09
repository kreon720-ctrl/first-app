import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { withTeamRole, requireLeader } from '@/lib/middleware/withTeamRole'
import {
  getScheduleById,
  updateSchedule,
  deleteSchedule,
} from '@/lib/db/queries/scheduleQueries'

interface UpdateScheduleBody {
  title?: string
  description?: string
  startAt?: string
  endAt?: string
}

/**
 * GET /api/teams/:teamId/schedules/:scheduleId
 *
 * 일정 상세 조회
 * - 팀 멤버만 접근 가능
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; scheduleId: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await withAuth(request)
    if (!authResult.success) return authResult.response

    const { teamId, scheduleId } = await params

    // 1. 팀 멤버십 검증
    const roleResult = await withTeamRole(authResult.user.userId, teamId)
    if (!roleResult.success) return roleResult.response

    // 2. 일정 조회
    const schedule = await getScheduleById(teamId, scheduleId)

    if (!schedule) {
      return NextResponse.json(
        { error: '일정을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: schedule.id,
      teamId: schedule.team_id,
      title: schedule.title,
      description: schedule.description,
      startAt: schedule.start_at,
      endAt: schedule.end_at,
      createdBy: schedule.created_by,
      createdAt: schedule.created_at,
      updatedAt: schedule.updated_at,
    })
  } catch (err) {
    console.error('Get schedule detail error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/teams/:teamId/schedules/:scheduleId
 *
 * 일정 수정 (LEADER 전용)
 * - 부분 수정 지원 (title, description, startAt, endAt)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; scheduleId: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await withAuth(request)
    if (!authResult.success) return authResult.response

    const { teamId, scheduleId } = await params

    // 1. 팀장 권한 검증
    const leaderResult = await requireLeader(authResult.user.userId, teamId)
    if (!leaderResult.success) return leaderResult.response

    // 2. 기존 일정 존재 확인
    const existingSchedule = await getScheduleById(teamId, scheduleId)
    if (!existingSchedule) {
      return NextResponse.json(
        { error: '일정을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 3. 요청 본문 파싱
    const body: UpdateScheduleBody = await request.json()
    const { title, description, startAt, endAt } = body

    // 날짜 유효성 검증 (제공된 경우에만)
    if (startAt || endAt) {
      const startDate = startAt ? new Date(startAt) : existingSchedule.start_at
      const endDate = endAt ? new Date(endAt) : existingSchedule.end_at

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
    }

    // 4. 일정 수정
    const updatedSchedule = await updateSchedule(teamId, scheduleId, {
      title,
      description: description ?? undefined,
      startAt: startAt ? new Date(startAt) : undefined,
      endAt: endAt ? new Date(endAt) : undefined,
    })

    if (!updatedSchedule) {
      return NextResponse.json(
        { error: '일정 수정에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      id: updatedSchedule.id,
      teamId: updatedSchedule.team_id,
      title: updatedSchedule.title,
      description: updatedSchedule.description,
      startAt: updatedSchedule.start_at,
      endAt: updatedSchedule.end_at,
      createdBy: updatedSchedule.created_by,
      createdAt: updatedSchedule.created_at,
      updatedAt: updatedSchedule.updated_at,
    })
  } catch (err) {
    console.error('Update schedule error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/teams/:teamId/schedules/:scheduleId
 *
 * 일정 삭제 (LEADER 전용)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; scheduleId: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await withAuth(request)
    if (!authResult.success) return authResult.response

    const { teamId, scheduleId } = await params

    // 1. 팀장 권한 검증
    const leaderResult = await requireLeader(authResult.user.userId, teamId)
    if (!leaderResult.success) return leaderResult.response

    // 2. 일정 삭제
    const deleted = await deleteSchedule(teamId, scheduleId)

    if (!deleted) {
      return NextResponse.json(
        { error: '일정을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: '일정이 삭제되었습니다.' })
  } catch (err) {
    console.error('Delete schedule error:', err)
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
