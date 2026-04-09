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

vi.mock('@/lib/db/queries/teamQueries', () => ({
  getUserTeams: vi.fn(),
  createTeam: vi.fn(),
  addTeamMember: vi.fn(),
  getTeamById: vi.fn(),
  getTeamMembers: vi.fn(),
  getPublicTeams: vi.fn(),
  getUserTeamRole: vi.fn(),
}))

vi.mock('@/lib/db/queries/joinRequestQueries', () => ({
  createJoinRequest: vi.fn(),
  getPendingJoinRequestsByTeam: vi.fn(),
  getJoinRequestById: vi.fn(),
  updateJoinRequestStatus: vi.fn(),
  getPendingJoinRequestsByLeader: vi.fn(),
}))

// Import mocked modules
import * as withAuthModule from '@/lib/middleware/withAuth'
import * as withTeamRoleModule from '@/lib/middleware/withTeamRole'
import * as teamQueries from '@/lib/db/queries/teamQueries'
import * as joinRequestQueries from '@/lib/db/queries/joinRequestQueries'

const mockWithAuth = vi.mocked(withAuthModule.withAuth)
const mockWithTeamRole = vi.mocked(withTeamRoleModule.withTeamRole)
const mockRequireLeader = vi.mocked(withTeamRoleModule.requireLeader)
const mockGetUserTeams = vi.mocked(teamQueries.getUserTeams)
const mockCreateTeam = vi.mocked(teamQueries.createTeam)
const mockAddTeamMember = vi.mocked(teamQueries.addTeamMember)
const mockGetTeamById = vi.mocked(teamQueries.getTeamById)
const mockGetTeamMembers = vi.mocked(teamQueries.getTeamMembers)
const mockGetPublicTeams = vi.mocked(teamQueries.getPublicTeams)
const mockCreateJoinRequest = vi.mocked(joinRequestQueries.createJoinRequest)
const mockGetPendingJoinRequestsByTeam = vi.mocked(joinRequestQueries.getPendingJoinRequestsByTeam)
const mockGetJoinRequestById = vi.mocked(joinRequestQueries.getJoinRequestById)
const mockUpdateJoinRequestStatus = vi.mocked(joinRequestQueries.updateJoinRequestStatus)
const mockGetPendingJoinRequestsByLeader = vi.mocked(joinRequestQueries.getPendingJoinRequestsByLeader)

describe('BE-08 to BE-10: Team and Join Request APIs', () => {
  const testUser = { userId: 'user-123', userEmail: 'test@example.com' }
  const testTeam = {
    id: 'team-456',
    name: 'Test Team',
    leader_id: 'user-123',
    created_at: new Date('2026-04-01'),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/teams', () => {
    const endpoint = async (authSuccess: boolean, authUser = testUser) => {
      vi.resetModules()
      mockWithAuth.mockResolvedValueOnce(
        authSuccess
          ? { success: true, user: authUser }
          : { success: false, response: new NextResponse(JSON.stringify({ error: '인증이 필요합니다.' }), { status: 401 }) }
      )

      if (authSuccess) {
        mockGetUserTeams.mockResolvedValueOnce([
          {
            id: 'team-1',
            name: 'Team A',
            leader_id: 'user-123',
            role: 'LEADER',
            created_at: new Date('2026-04-01'),
          },
        ])
      }

      const { GET } = await import('@/app/api/teams/route')
      const request = new NextRequest('http://localhost/api/teams')
      return GET(request)
    }

    it('should return user teams with roles when authenticated', async () => {
      const response = await endpoint(true)
      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.teams).toHaveLength(1)
      expect(json.teams[0]).toHaveProperty('myRole', 'LEADER')
      expect(mockGetUserTeams).toHaveBeenCalledWith('user-123')
    })

    it('should return 401 when not authenticated', async () => {
      const response = await endpoint(false)
      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/teams', () => {
    const endpoint = async (body: any, authSuccess = true) => {
      vi.resetModules()
      mockWithAuth.mockResolvedValueOnce(
        authSuccess
          ? { success: true, user: testUser }
          : { success: false, response: new NextResponse(JSON.stringify({ error: '인증이 필요합니다.' }), { status: 401 }) }
      )

      if (authSuccess) {
        mockCreateTeam.mockResolvedValueOnce({
          id: 'new-team-id',
          name: body?.name || 'New Team',
          leader_id: testUser.userId,
          created_at: new Date(),
        })
        mockAddTeamMember.mockResolvedValueOnce({} as any)
      }

      const { POST } = await import('@/app/api/teams/route')
      const request = new NextRequest('http://localhost/api/teams', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      return POST(request)
    }

    it('should create team and register creator as LEADER', async () => {
      const response = await endpoint({ name: 'New Team' })
      expect(response.status).toBe(201)
      const json = await response.json()
      expect(json.myRole).toBe('LEADER')
      expect(mockCreateTeam).toHaveBeenCalledWith('New Team', 'user-123')
      expect(mockAddTeamMember).toHaveBeenCalledWith('new-team-id', 'user-123', 'LEADER')
    })

    it('should return 400 when name is missing', async () => {
      const response = await endpoint({})
      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toBe('팀 이름은 필수입니다.')
    })

    it('should return 400 when name exceeds 100 chars', async () => {
      const response = await endpoint({ name: 'A'.repeat(101) })
      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toBe('팀 이름은 최대 100자까지 입력 가능합니다.')
    })

    it('should return 401 when not authenticated', async () => {
      const response = await endpoint({ name: 'Team' }, false)
      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/teams/public', () => {
    const endpoint = async (authSuccess = true) => {
      vi.resetModules()
      mockWithAuth.mockResolvedValueOnce(
        authSuccess
          ? { success: true, user: testUser }
          : { success: false, response: new NextResponse(JSON.stringify({ error: '인증이 필요합니다.' }), { status: 401 }) }
      )

      if (authSuccess) {
        mockGetPublicTeams.mockResolvedValueOnce([
          {
            id: 'team-1',
            name: 'Public Team',
            leader_id: 'leader-1',
            leader_name: 'Leader Name',
            member_count: 5,
            created_at: new Date('2026-04-01'),
          },
        ])
      }

      const { GET } = await import('@/app/api/teams/public/route')
      const request = new NextRequest('http://localhost/api/teams/public')
      return GET(request)
    }

    it('should return public teams with member count', async () => {
      const response = await endpoint(true)
      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.teams).toHaveLength(1)
      expect(json.teams[0]).toHaveProperty('memberCount', 5)
      expect(json.teams[0]).toHaveProperty('leaderName')
    })

    it('should return 401 when not authenticated', async () => {
      const response = await endpoint(false)
      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/teams/:teamId', () => {
    const endpoint = async (teamId: string, authSuccess = true, teamExists = true, hasAccess = true) => {
      vi.resetModules()
      mockWithAuth.mockResolvedValueOnce(
        authSuccess
          ? { success: true, user: testUser }
          : { success: false, response: new NextResponse(JSON.stringify({ error: '인증이 필요합니다.' }), { status: 401 }) }
      )

      if (authSuccess) {
        mockGetTeamById.mockResolvedValueOnce(teamExists ? testTeam : null)

        if (teamExists && hasAccess) {
          mockWithTeamRole.mockResolvedValueOnce({
            success: true,
            context: { userId: testUser.userId, teamId, role: 'MEMBER' },
          })
          mockGetTeamMembers.mockResolvedValueOnce([
            {
              user_id: 'user-123',
              name: 'Test User',
              email: 'test@example.com',
              role: 'MEMBER',
              joined_at: new Date('2026-04-01'),
            },
          ])
        } else if (teamExists && !hasAccess) {
          mockWithTeamRole.mockResolvedValueOnce({
            success: false,
            response: new NextResponse(JSON.stringify({ error: '해당 팀에 접근 권한이 없습니다.' }), { status: 403 }),
          })
        }
      }

      const { GET } = await import('@/app/api/teams/[teamId]/route')
      const request = new NextRequest(`http://localhost/api/teams/${teamId}`)
      return GET(request, { params: Promise.resolve({ teamId }) })
    }

    it('should return team details with members when authenticated and has access', async () => {
      const response = await endpoint('team-456', true, true, true)
      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json).toHaveProperty('members')
      expect(json.members).toHaveLength(1)
    })

    it('should return 404 when team does not exist', async () => {
      const response = await endpoint('non-existent', true, false, false)
      expect(response.status).toBe(404)
      const json = await response.json()
      expect(json.error).toBe('팀을 찾을 수 없습니다.')
    })

    it('should return 403 when user has no access', async () => {
      const response = await endpoint('team-456', true, true, false)
      expect(response.status).toBe(403)
    })

    it('should return 401 when not authenticated', async () => {
      const response = await endpoint('team-456', false, true, true)
      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/teams/:teamId/join-requests', () => {
    const endpoint = async (teamId: string, authSuccess = true, teamExists = true) => {
      vi.resetModules()
      mockWithAuth.mockResolvedValueOnce(
        authSuccess
          ? { success: true, user: testUser }
          : { success: false, response: new NextResponse(JSON.stringify({ error: '인증이 필요합니다.' }), { status: 401 }) }
      )

      if (authSuccess) {
        mockGetTeamById.mockResolvedValueOnce(teamExists ? testTeam : null)

        if (teamExists) {
          mockCreateJoinRequest.mockResolvedValueOnce({
            id: 'join-req-id',
            team_id: teamId,
            requester_id: testUser.userId,
            status: 'PENDING',
            requested_at: new Date(),
            responded_at: null,
          })
        }
      }

      const { POST } = await import('@/app/api/teams/[teamId]/join-requests/route')
      const request = new NextRequest(`http://localhost/api/teams/${teamId}/join-requests`, {
        method: 'POST',
      })
      return POST(request, { params: Promise.resolve({ teamId }) })
    }

    it('should create join request successfully', async () => {
      const response = await endpoint('team-456', true, true)
      expect(response.status).toBe(201)
      const json = await response.json()
      expect(json.status).toBe('PENDING')
      expect(mockCreateJoinRequest).toHaveBeenCalledWith('team-456', 'user-123')
    })

    it('should return 404 when team does not exist', async () => {
      const response = await endpoint('non-existent', true, false)
      expect(response.status).toBe(404)
    })

    it('should return 401 when not authenticated', async () => {
      const response = await endpoint('team-456', false, true)
      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/teams/:teamId/join-requests', () => {
    const endpoint = async (teamId: string, authSuccess = true, isLeader = true) => {
      vi.resetModules()
      mockWithAuth.mockResolvedValueOnce(
        authSuccess
          ? { success: true, user: testUser }
          : { success: false, response: new NextResponse(JSON.stringify({ error: '인증이 필요합니다.' }), { status: 401 }) }
      )

      if (authSuccess) {
        mockGetTeamById.mockResolvedValueOnce(testTeam)

        if (isLeader) {
          mockRequireLeader.mockResolvedValueOnce({
            success: true,
            context: { userId: testUser.userId, teamId, role: 'LEADER' },
          })
          mockGetPendingJoinRequestsByTeam.mockResolvedValueOnce([
            {
              id: 'req-1',
              team_id: teamId,
              team_name: 'Test Team',
              requester_id: 'requester-1',
              requester_name: 'Requester',
              requester_email: 'req@example.com',
              status: 'PENDING',
              requested_at: new Date(),
              responded_at: null,
            },
          ])
        } else {
          mockRequireLeader.mockResolvedValueOnce({
            success: false,
            response: new NextResponse(JSON.stringify({ error: '팀장만 가입 신청 목록을 조회할 수 있습니다.' }), { status: 403 }),
          })
        }
      }

      const { GET } = await import('@/app/api/teams/[teamId]/join-requests/route')
      const request = new NextRequest(`http://localhost/api/teams/${teamId}/join-requests`)
      return GET(request, { params: Promise.resolve({ teamId }) })
    }

    it('should return pending join requests for team leader', async () => {
      const response = await endpoint('team-456', true, true)
      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.joinRequests).toHaveLength(1)
      expect(json.joinRequests[0]).toHaveProperty('requesterName')
    })

    it('should return 403 for non-leader', async () => {
      const response = await endpoint('team-456', true, false)
      expect(response.status).toBe(403)
    })

    it('should return 401 when not authenticated', async () => {
      const response = await endpoint('team-456', false, true)
      expect(response.status).toBe(401)
    })
  })

  describe('PATCH /api/teams/:teamId/join-requests/:requestId', () => {
    const endpoint = async (teamId: string, requestId: string, body: any, authSuccess = true, isLeader = true) => {
      vi.resetModules()
      mockWithAuth.mockResolvedValueOnce(
        authSuccess
          ? { success: true, user: testUser }
          : { success: false, response: new NextResponse(JSON.stringify({ error: '인증이 필요합니다.' }), { status: 401 }) }
      )

      if (authSuccess) {
        mockGetTeamById.mockResolvedValueOnce(testTeam)

        if (isLeader) {
          mockRequireLeader.mockResolvedValueOnce({
            success: true,
            context: { userId: testUser.userId, teamId, role: 'LEADER' },
          })

          mockGetJoinRequestById.mockResolvedValueOnce({
            id: requestId,
            team_id: teamId,
            requester_id: 'requester-1',
            status: 'PENDING',
            requested_at: new Date(),
            responded_at: null,
          })

          mockUpdateJoinRequestStatus.mockResolvedValueOnce({
            id: requestId,
            team_id: teamId,
            requester_id: 'requester-1',
            status: body?.action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
            requested_at: new Date(),
            responded_at: new Date(),
          })

          mockAddTeamMember.mockResolvedValueOnce({} as any)
        } else {
          mockRequireLeader.mockResolvedValueOnce({
            success: false,
            response: new NextResponse(JSON.stringify({ error: '팀장만 가입 신청을 처리할 수 있습니다.' }), { status: 403 }),
          })
        }
      }

      const { PATCH } = await import('@/app/api/teams/[teamId]/join-requests/[requestId]/route')
      const request = new NextRequest(`http://localhost/api/teams/${teamId}/join-requests/${requestId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      return PATCH(request, { params: Promise.resolve({ teamId, requestId }) })
    }

    it('should approve join request and add member', async () => {
      const response = await endpoint('team-456', 'req-1', { action: 'APPROVE' }, true, true)
      expect(response.status).toBe(200)
      const json = await response.json()
      // The actual endpoint returns the status from the database which is 'APPROVED'
      expect(['APPROVE', 'APPROVED']).toContain(json.status)
      expect(mockUpdateJoinRequestStatus).toHaveBeenCalledWith('req-1', 'APPROVE')
      expect(mockAddTeamMember).toHaveBeenCalledWith('team-456', 'requester-1', 'MEMBER')
    })

    it('should reject join request without adding member', async () => {
      const response = await endpoint('team-456', 'req-1', { action: 'REJECT' }, true, true)
      expect(response.status).toBe(200)
      expect(mockUpdateJoinRequestStatus).toHaveBeenCalledWith('req-1', 'REJECT')
      // addTeamMember should not be called for REJECT
      expect(mockAddTeamMember).not.toHaveBeenCalled()
    })

    it('should return 400 when action is missing', async () => {
      // This test needs special handling since endpoint returns early for isLeader=false
      vi.resetModules()
      mockWithAuth.mockResolvedValueOnce({ success: true, user: testUser })
      mockGetTeamById.mockResolvedValueOnce(testTeam)
      mockRequireLeader.mockResolvedValueOnce({
        success: true,
        context: { userId: testUser.userId, teamId: 'team-456', role: 'LEADER' },
      })

      const { PATCH } = await import('@/app/api/teams/[teamId]/join-requests/[requestId]/route')
      const request = new NextRequest('http://localhost/api/teams/team-456/join-requests/req-1', {
        method: 'PATCH',
        body: JSON.stringify({}),
      })
      const response = await PATCH(request, { params: Promise.resolve({ teamId: 'team-456', requestId: 'req-1' }) })

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toBe('action은 필수입니다.')
    })

    it('should return 400 for invalid action', async () => {
      vi.resetModules()
      mockWithAuth.mockResolvedValueOnce({ success: true, user: testUser })
      mockGetTeamById.mockResolvedValueOnce(testTeam)
      mockRequireLeader.mockResolvedValueOnce({
        success: true,
        context: { userId: testUser.userId, teamId: 'team-456', role: 'LEADER' },
      })

      const { PATCH } = await import('@/app/api/teams/[teamId]/join-requests/[requestId]/route')
      const request = new NextRequest('http://localhost/api/teams/team-456/join-requests/req-1', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'INVALID' }),
      })
      const response = await PATCH(request, { params: Promise.resolve({ teamId: 'team-456', requestId: 'req-1' }) })

      expect(response.status).toBe(400)
    })

    it('should return 403 for non-leader', async () => {
      const response = await endpoint('team-456', 'req-1', { action: 'APPROVE' }, true, false)
      // The endpoint function sets up requireLeader to return 403
      expect(response.status).toBe(403)
    })

    it('should return 401 when not authenticated', async () => {
      const response = await endpoint('team-456', 'req-1', { action: 'APPROVE' }, false, true)
      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/me/tasks', () => {
    const endpoint = async (authSuccess = true, tasks: any[] = []) => {
      vi.resetModules()
      mockWithAuth.mockResolvedValueOnce(
        authSuccess
          ? { success: true, user: testUser }
          : { success: false, response: new NextResponse(JSON.stringify({ error: '인증이 필요합니다.' }), { status: 401 }) }
      )

      if (authSuccess) {
        mockGetPendingJoinRequestsByLeader.mockResolvedValueOnce(tasks)
      }

      const { GET } = await import('@/app/api/me/tasks/route')
      const request = new NextRequest('http://localhost/api/me/tasks')
      return GET(request)
    }

    it('should return pending tasks for leader', async () => {
      const mockTasks = [
        {
          id: 'req-1',
          team_id: 'team-1',
          team_name: 'Team 1',
          requester_id: 'req-1',
          requester_name: 'Requester 1',
          requester_email: 'req1@example.com',
          status: 'PENDING',
          requested_at: new Date(),
          responded_at: null,
        },
      ]
      const response = await endpoint(true, mockTasks)
      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.totalPendingCount).toBe(1)
      expect(json.tasks).toHaveLength(1)
      expect(json.tasks[0]).toHaveProperty('requesterEmail')
      expect(mockGetPendingJoinRequestsByLeader).toHaveBeenCalledWith('user-123')
    })

    it('should return 401 when not authenticated', async () => {
      const response = await endpoint(false, [])
      expect(response.status).toBe(401)
    })

    it('should return empty array when no pending tasks', async () => {
      const response = await endpoint(true, [])
      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.totalPendingCount).toBe(0)
      expect(json.tasks).toEqual([])
    })
  })
})
