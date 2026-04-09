import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Mock middleware and database queries
vi.mock('@/lib/middleware/withAuth', () => ({
  withAuth: vi.fn(),
}))

vi.mock('@/lib/middleware/withTeamRole', () => ({
  withTeamRole: vi.fn(),
  requireLeader: vi.fn(),
}))

vi.mock('@/lib/db/queries/scheduleQueries', () => ({
  getSchedulesByDateRange: vi.fn(),
  createSchedule: vi.fn(),
  getScheduleById: vi.fn(),
  updateSchedule: vi.fn(),
  deleteSchedule: vi.fn(),
}))

vi.mock('@/lib/db/queries/teamQueries', () => ({
  getTeamById: vi.fn(),
}))

vi.mock('@/lib/utils/timezone', () => ({
  getKstDateRange: vi.fn(),
}))

// Import mocked modules
import * as withAuthModule from '@/lib/middleware/withAuth'
import * as withTeamRoleModule from '@/lib/middleware/withTeamRole'
import * as scheduleQueries from '@/lib/db/queries/scheduleQueries'
import * as timezoneUtils from '@/lib/utils/timezone'

const mockWithAuth = vi.mocked(withAuthModule.withAuth)
const mockWithTeamRole = vi.mocked(withTeamRoleModule.withTeamRole)
const mockRequireLeader = vi.mocked(withTeamRoleModule.requireLeader)
const mockGetSchedulesByDateRange = vi.mocked(scheduleQueries.getSchedulesByDateRange)
const mockCreateSchedule = vi.mocked(scheduleQueries.createSchedule)
const mockGetScheduleById = vi.mocked(scheduleQueries.getScheduleById)
const mockUpdateSchedule = vi.mocked(scheduleQueries.updateSchedule)
const mockDeleteSchedule = vi.mocked(scheduleQueries.deleteSchedule)
const mockGetKstDateRange = vi.mocked(timezoneUtils.getKstDateRange)

describe('BE-11: Schedule APIs', () => {
  const testUser = { userId: 'user-123', userEmail: 'test@example.com' }
  const testTeamId = 'team-456'
  const testSchedule = {
    id: 'schedule-1',
    team_id: testTeamId,
    created_by: 'user-123',
    title: 'Test Schedule',
    description: 'Test Description',
    start_at: new Date('2026-04-10T01:00:00Z'),
    end_at: new Date('2026-04-10T02:00:00Z'),
    created_at: new Date('2026-04-01'),
    updated_at: new Date('2026-04-01'),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/teams/:teamId/schedules', () => {
    const endpoint = async (teamId: string, authSuccess = true, view = 'month', date = '2026-04-15') => {
      vi.resetModules()
      mockWithAuth.mockResolvedValueOnce(
        authSuccess
          ? { success: true, user: testUser }
          : { success: false, response: new NextResponse(JSON.stringify({ error: '인증이 필요합니다.' }), { status: 401 }) }
      )

      if (authSuccess) {
        mockWithTeamRole.mockResolvedValueOnce({
          success: true,
          context: { userId: testUser.userId, teamId, role: 'MEMBER' },
        })

        mockGetKstDateRange.mockReturnValueOnce({
          start: new Date('2026-03-31T15:00:00Z'),
          end: new Date('2026-04-30T15:00:00Z'),
        })

        mockGetSchedulesByDateRange.mockResolvedValueOnce([testSchedule])
      }

      const { GET } = await import('@/app/api/teams/[teamId]/schedules/route')
      const url = new URL(`http://localhost/api/teams/${teamId}/schedules`)
      url.searchParams.set('view', view)
      url.searchParams.set('date', date)
      const request = new NextRequest(url.toString())
      return GET(request, { params: Promise.resolve({ teamId }) })
    }

    it('should return schedules for the date range', async () => {
      const response = await endpoint(testTeamId, true, 'month', '2026-04-15')
      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.schedules).toHaveLength(1)
      expect(json.schedules[0]).toHaveProperty('title', 'Test Schedule')
      expect(json.view).toBe('month')
      expect(json.date).toBe('2026-04-15')
      expect(mockGetKstDateRange).toHaveBeenCalledWith('month', '2026-04-15')
    })

    it('should return 401 when not authenticated', async () => {
      const response = await endpoint(testTeamId, false)
      expect(response.status).toBe(401)
    })

    it('should return 403 when user is not a team member', async () => {
      vi.resetModules()
      mockWithAuth.mockResolvedValueOnce({ success: true, user: testUser })
      mockWithTeamRole.mockResolvedValueOnce({
        success: false,
        response: new NextResponse(JSON.stringify({ error: '해당 팀에 접근 권한이 없습니다.' }), { status: 403 }),
      })

      const { GET } = await import('@/app/api/teams/[teamId]/schedules/route')
      const request = new NextRequest('http://localhost/api/teams/team-456/schedules')
      const response = await GET(request, { params: Promise.resolve({ teamId: testTeamId }) })

      expect(response.status).toBe(403)
    })
  })

  describe('POST /api/teams/:teamId/schedules', () => {
    const endpoint = async (teamId: string, body: any, authSuccess = true, isLeader = true) => {
      vi.resetModules()
      mockWithAuth.mockResolvedValueOnce(
        authSuccess
          ? { success: true, user: testUser }
          : { success: false, response: new NextResponse(JSON.stringify({ error: '인증이 필요합니다.' }), { status: 401 }) }
      )

      if (authSuccess) {
        if (isLeader) {
          mockRequireLeader.mockResolvedValueOnce({
            success: true,
            context: { userId: testUser.userId, teamId, role: 'LEADER' },
          })
        } else {
          mockRequireLeader.mockResolvedValueOnce({
            success: false,
            response: new NextResponse(JSON.stringify({ error: '팀장만 이 작업을 수행할 수 있습니다.' }), { status: 403 }),
          })
        }

        if (isLeader && body?.title && body?.startAt && body?.endAt) {
          mockCreateSchedule.mockResolvedValueOnce({
            ...testSchedule,
            title: body.title,
            description: body.description ?? null,
            start_at: new Date(body.startAt),
            end_at: new Date(body.endAt),
          })
        }
      }

      const { POST } = await import('@/app/api/teams/[teamId]/schedules/route')
      const request = new NextRequest(`http://localhost/api/teams/${teamId}/schedules`, {
        method: 'POST',
        body: JSON.stringify(body),
      })
      return POST(request, { params: Promise.resolve({ teamId }) })
    }

    it('should create schedule successfully', async () => {
      const response = await endpoint(testTeamId, {
        title: 'New Schedule',
        description: 'Description',
        startAt: '2026-04-10T01:00:00Z',
        endAt: '2026-04-10T02:00:00Z',
      }, true, true)

      expect(response.status).toBe(201)
      const json = await response.json()
      expect(json.title).toBe('New Schedule')
      expect(mockCreateSchedule).toHaveBeenCalledWith({
        teamId: testTeamId,
        createdBy: testUser.userId,
        title: 'New Schedule',
        description: 'Description',
        startAt: new Date('2026-04-10T01:00:00Z'),
        endAt: new Date('2026-04-10T02:00:00Z'),
      })
    })

    it('should return 400 when title is missing', async () => {
      const response = await endpoint(testTeamId, {
        startAt: '2026-04-10T01:00:00Z',
        endAt: '2026-04-10T02:00:00Z',
      })

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toBe('제목은 필수입니다.')
    })

    it('should return 400 when title exceeds 200 chars', async () => {
      const response = await endpoint(testTeamId, {
        title: 'A'.repeat(201),
        startAt: '2026-04-10T01:00:00Z',
        endAt: '2026-04-10T02:00:00Z',
      })

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toBe('제목은 최대 200자까지 입력 가능합니다.')
    })

    it('should return 400 when startAt or endAt is missing', async () => {
      const response1 = await endpoint(testTeamId, { title: 'Test', startAt: '2026-04-10T01:00:00Z' })
      expect(response1.status).toBe(400)

      const response2 = await endpoint(testTeamId, { title: 'Test', endAt: '2026-04-10T02:00:00Z' })
      expect(response2.status).toBe(400)
    })

    it('should return 400 when endAt <= startAt', async () => {
      const response = await endpoint(testTeamId, {
        title: 'Test',
        startAt: '2026-04-10T02:00:00Z',
        endAt: '2026-04-10T01:00:00Z',
      })

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toBe('종료일은 시작일보다 늦어야 합니다.')
    })

    it('should return 403 for non-leader', async () => {
      const response = await endpoint(testTeamId, {
        title: 'Test',
        startAt: '2026-04-10T01:00:00Z',
        endAt: '2026-04-10T02:00:00Z',
      }, true, false)

      expect(response.status).toBe(403)
    })

    it('should return 401 when not authenticated', async () => {
      const response = await endpoint(testTeamId, {
        title: 'Test',
        startAt: '2026-04-10T01:00:00Z',
        endAt: '2026-04-10T02:00:00Z',
      }, false, true)

      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/teams/:teamId/schedules/:scheduleId', () => {
    const endpoint = async (teamId: string, scheduleId: string, authSuccess = true, scheduleExists = true) => {
      vi.resetModules()
      mockWithAuth.mockResolvedValueOnce(
        authSuccess
          ? { success: true, user: testUser }
          : { success: false, response: new NextResponse(JSON.stringify({ error: '인증이 필요합니다.' }), { status: 401 }) }
      )

      if (authSuccess) {
        mockWithTeamRole.mockResolvedValueOnce({
          success: true,
          context: { userId: testUser.userId, teamId, role: 'MEMBER' },
        })

        mockGetScheduleById.mockResolvedValueOnce(scheduleExists ? testSchedule : null)
      }

      const { GET } = await import('@/app/api/teams/[teamId]/schedules/[scheduleId]/route')
      const request = new NextRequest(`http://localhost/api/teams/${teamId}/schedules/${scheduleId}`)
      return GET(request, { params: Promise.resolve({ teamId, scheduleId }) })
    }

    it('should return schedule detail', async () => {
      const response = await endpoint(testTeamId, 'schedule-1', true, true)
      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.id).toBe('schedule-1')
      expect(json.title).toBe('Test Schedule')
    })

    it('should return 404 when schedule not found', async () => {
      const response = await endpoint(testTeamId, 'non-existent', true, false)
      expect(response.status).toBe(404)
      const json = await response.json()
      expect(json.error).toBe('일정을 찾을 수 없습니다.')
    })

    it('should return 401 when not authenticated', async () => {
      const response = await endpoint(testTeamId, 'schedule-1', false, true)
      expect(response.status).toBe(401)
    })
  })

  describe('PATCH /api/teams/:teamId/schedules/:scheduleId', () => {
    const endpoint = async (teamId: string, scheduleId: string, body: any, authSuccess = true, isLeader = true, scheduleExists = true) => {
      vi.resetModules()
      mockWithAuth.mockResolvedValueOnce(
        authSuccess
          ? { success: true, user: testUser }
          : { success: false, response: new NextResponse(JSON.stringify({ error: '인증이 필요합니다.' }), { status: 401 }) }
      )

      if (authSuccess) {
        if (isLeader) {
          mockRequireLeader.mockResolvedValueOnce({
            success: true,
            context: { userId: testUser.userId, teamId, role: 'LEADER' },
          })
        } else {
          mockRequireLeader.mockResolvedValueOnce({
            success: false,
            response: new NextResponse(JSON.stringify({ error: '팀장만 이 작업을 수행할 수 있습니다.' }), { status: 403 }),
          })
        }

        mockGetScheduleById.mockResolvedValueOnce(scheduleExists ? testSchedule : null)

        if (isLeader && scheduleExists) {
          mockUpdateSchedule.mockResolvedValueOnce({
            ...testSchedule,
            title: body.title ?? testSchedule.title,
            description: body.description !== undefined ? body.description : testSchedule.description,
            start_at: body.startAt ? new Date(body.startAt) : testSchedule.start_at,
            end_at: body.endAt ? new Date(body.endAt) : testSchedule.end_at,
            updated_at: new Date(),
          })
        }
      }

      const { PATCH } = await import('@/app/api/teams/[teamId]/schedules/[scheduleId]/route')
      const request = new NextRequest(`http://localhost/api/teams/${teamId}/schedules/${scheduleId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      return PATCH(request, { params: Promise.resolve({ teamId, scheduleId }) })
    }

    it('should update schedule successfully', async () => {
      const response = await endpoint(testTeamId, 'schedule-1', {
        title: 'Updated Title',
      }, true, true, true)

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.title).toBe('Updated Title')
      expect(mockUpdateSchedule).toHaveBeenCalled()
    })

    it('should return 404 when schedule not found', async () => {
      const response = await endpoint(testTeamId, 'non-existent', { title: 'Updated' }, true, true, false)
      expect(response.status).toBe(404)
    })

    it('should return 400 when endAt <= startAt', async () => {
      const response = await endpoint(testTeamId, 'schedule-1', {
        startAt: '2026-04-10T02:00:00Z',
        endAt: '2026-04-10T01:00:00Z',
      }, true, true, true)

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toBe('종료일은 시작일보다 늦어야 합니다.')
    })

    it('should return 403 for non-leader', async () => {
      const response = await endpoint(testTeamId, 'schedule-1', { title: 'Updated' }, true, false, true)
      expect(response.status).toBe(403)
    })

    it('should return 401 when not authenticated', async () => {
      const response = await endpoint(testTeamId, 'schedule-1', { title: 'Updated' }, false, true, true)
      expect(response.status).toBe(401)
    })
  })

  describe('DELETE /api/teams/:teamId/schedules/:scheduleId', () => {
    const endpoint = async (teamId: string, scheduleId: string, authSuccess = true, isLeader = true, scheduleExists = true) => {
      vi.resetModules()
      mockWithAuth.mockResolvedValueOnce(
        authSuccess
          ? { success: true, user: testUser }
          : { success: false, response: new NextResponse(JSON.stringify({ error: '인증이 필요합니다.' }), { status: 401 }) }
      )

      if (authSuccess) {
        if (isLeader) {
          mockRequireLeader.mockResolvedValueOnce({
            success: true,
            context: { userId: testUser.userId, teamId, role: 'LEADER' },
          })
        } else {
          mockRequireLeader.mockResolvedValueOnce({
            success: false,
            response: new NextResponse(JSON.stringify({ error: '팀장만 이 작업을 수행할 수 있습니다.' }), { status: 403 }),
          })
        }

        mockDeleteSchedule.mockResolvedValueOnce(scheduleExists)
      }

      const { DELETE } = await import('@/app/api/teams/[teamId]/schedules/[scheduleId]/route')
      const request = new NextRequest(`http://localhost/api/teams/${teamId}/schedules/${scheduleId}`, {
        method: 'DELETE',
      })
      return DELETE(request, { params: Promise.resolve({ teamId, scheduleId }) })
    }

    it('should delete schedule successfully', async () => {
      const response = await endpoint(testTeamId, 'schedule-1', true, true, true)
      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.message).toBe('일정이 삭제되었습니다.')
      expect(mockDeleteSchedule).toHaveBeenCalledWith(testTeamId, 'schedule-1')
    })

    it('should return 404 when schedule not found', async () => {
      const response = await endpoint(testTeamId, 'non-existent', true, true, false)
      expect(response.status).toBe(404)
      const json = await response.json()
      expect(json.error).toBe('일정을 찾을 수 없습니다.')
    })

    it('should return 403 for non-leader', async () => {
      const response = await endpoint(testTeamId, 'schedule-1', true, false, true)
      expect(response.status).toBe(403)
    })

    it('should return 401 when not authenticated', async () => {
      const response = await endpoint(testTeamId, 'schedule-1', false, true, true)
      expect(response.status).toBe(401)
    })
  })
})
