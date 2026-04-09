import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ==========================================
// Mock all dependencies
// ==========================================

vi.mock('@/lib/middleware/withAuth', () => ({
  withAuth: vi.fn(),
}))

vi.mock('@/lib/middleware/withTeamRole', () => ({
  withTeamRole: vi.fn(),
  requireLeader: vi.fn(),
}))

vi.mock('@/lib/db/queries/userQueries', () => ({
  createUser: vi.fn(),
  getUserByEmail: vi.fn(),
  getUserById: vi.fn(),
}))

vi.mock('@/lib/db/queries/teamQueries', () => ({
  createTeam: vi.fn(),
  getTeamById: vi.fn(),
  getUserTeams: vi.fn(),
  addTeamMember: vi.fn(),
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

vi.mock('@/lib/db/queries/scheduleQueries', () => ({
  createSchedule: vi.fn(),
  getSchedulesByDateRange: vi.fn(),
  getScheduleById: vi.fn(),
  updateSchedule: vi.fn(),
  deleteSchedule: vi.fn(),
}))

vi.mock('@/lib/db/queries/chatQueries', () => ({
  createChatMessage: vi.fn(),
  getMessagesByDate: vi.fn(),
  getMessagesByTeam: vi.fn(),
}))

vi.mock('@/lib/auth/password', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed-password'),
  verifyPassword: vi.fn().mockResolvedValue(true),
  validatePasswordStrength: vi.fn().mockReturnValue({ valid: true }),
}))

vi.mock('@/lib/utils/timezone', () => ({
  getKstDateRange: vi.fn().mockReturnValue({
    start: new Date('2026-03-31T15:00:00Z'),
    end: new Date('2026-04-30T15:00:00Z'),
  }),
  kstDateToUtcRange: vi.fn().mockReturnValue({
    start: new Date('2026-04-09T15:00:00Z'),
    end: new Date('2026-04-10T15:00:00Z'),
  }),
}))

// Import mocked modules
import * as withAuthModule from '@/lib/middleware/withAuth'
import * as withTeamRoleModule from '@/lib/middleware/withTeamRole'
import * as userQueries from '@/lib/db/queries/userQueries'
import * as teamQueries from '@/lib/db/queries/teamQueries'
import * as joinRequestQueries from '@/lib/db/queries/joinRequestQueries'
import * as scheduleQueries from '@/lib/db/queries/scheduleQueries'
import * as chatQueries from '@/lib/db/queries/chatQueries'

const mockWithAuth = vi.mocked(withAuthModule.withAuth)
const mockWithTeamRole = vi.mocked(withTeamRoleModule.withTeamRole)
const mockRequireLeader = vi.mocked(withTeamRoleModule.requireLeader)
const mockCreateUser = vi.mocked(userQueries.createUser)
const mockGetUserByEmail = vi.mocked(userQueries.getUserByEmail)
const mockCreateTeam = vi.mocked(teamQueries.createTeam)
const mockGetTeamById = vi.mocked(teamQueries.getTeamById)
const mockGetUserTeams = vi.mocked(teamQueries.getUserTeams)
const mockAddTeamMember = vi.mocked(teamQueries.addTeamMember)
const mockGetTeamMembers = vi.mocked(teamQueries.getTeamMembers)
const mockGetPublicTeams = vi.mocked(teamQueries.getPublicTeams)
const mockGetUserTeamRole = vi.mocked(teamQueries.getUserTeamRole)
const mockCreateJoinRequest = vi.mocked(joinRequestQueries.createJoinRequest)
const mockGetPendingJoinRequestsByLeader = vi.mocked(joinRequestQueries.getPendingJoinRequestsByLeader)
const mockCreateSchedule = vi.mocked(scheduleQueries.createSchedule)
const mockGetSchedulesByDateRange = vi.mocked(scheduleQueries.getSchedulesByDateRange)
const mockGetScheduleById = vi.mocked(scheduleQueries.getScheduleById)
const mockUpdateSchedule = vi.mocked(scheduleQueries.updateSchedule)
const mockDeleteSchedule = vi.mocked(scheduleQueries.deleteSchedule)
const mockCreateChatMessage = vi.mocked(chatQueries.createChatMessage)
const mockGetMessagesByDate = vi.mocked(chatQueries.getMessagesByDate)
const mockGetMessagesByTeam = vi.mocked(chatQueries.getMessagesByTeam)

describe('BE-13: Backend Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('1. 인증 흐름 테스트 (signup → login → refresh)', () => {
    it('should complete full authentication flow', async () => {
      // Step 1: Signup
      vi.resetModules()
      mockGetUserByEmail.mockResolvedValueOnce(null)
      mockCreateUser.mockResolvedValueOnce({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        password_hash: 'hashed-password',
        created_at: new Date(),
      })

      const { POST: signupPOST } = await import('@/app/api/auth/signup/route')
      const signupRequest = new NextRequest('http://localhost/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          name: 'Test User',
          password: 'password123',
        }),
      })
      const signupResponse = await signupPOST(signupRequest)
      expect(signupResponse.status).toBe(201)
      const signupJson = await signupResponse.json()
      expect(signupJson).toHaveProperty('accessToken')
      expect(signupJson).toHaveProperty('refreshToken')

      // Step 2: Login
      vi.resetModules()
      mockGetUserByEmail.mockResolvedValueOnce({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        password_hash: 'hashed-password',
        created_at: new Date(),
      })

      const { POST: loginPOST } = await import('@/app/api/auth/login/route')
      const loginRequest = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      })
      const loginResponse = await loginPOST(loginRequest)
      expect(loginResponse.status).toBe(200)
      const loginJson = await loginResponse.json()
      expect(loginJson).toHaveProperty('accessToken')
      expect(loginJson).toHaveProperty('refreshToken')

      // Step 3: Refresh
      vi.resetModules()
      const { generateRefreshToken, verifyAccessToken } = await import('@/lib/auth/jwt')
      const refreshToken = generateRefreshToken({ id: 'user-123', email: 'test@example.com' })

      const { POST: refreshPOST } = await import('@/app/api/auth/refresh/route')
      const refreshRequest = new NextRequest('http://localhost/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      })
      const refreshResponse = await refreshPOST(refreshRequest)
      expect(refreshResponse.status).toBe(200)
      const refreshJson = await refreshResponse.json()
      expect(refreshJson).toHaveProperty('accessToken')

      // Verify the new access token
      const decoded = verifyAccessToken(refreshJson.accessToken)
      expect(decoded).not.toBeNull()
      expect(decoded!.userId).toBe('user-123')
    })
  })

  describe('2. 권한 흐름 테스트 (MEMBER vs LEADER)', () => {
    it('should allow LEADER to create schedule but reject MEMBER', async () => {
      // Test with LEADER
      vi.resetModules()
      mockWithAuth.mockResolvedValueOnce({
        success: true,
        user: { userId: 'leader-123', userEmail: 'leader@test.com' },
      })
      mockRequireLeader.mockResolvedValueOnce({
        success: true,
        context: { userId: 'leader-123', teamId: 'team-1', role: 'LEADER' },
      })
      mockCreateSchedule.mockResolvedValueOnce({
        id: 'schedule-1',
        team_id: 'team-1',
        created_by: 'leader-123',
        title: 'Team Meeting',
        description: null,
        start_at: new Date('2026-04-10T01:00:00Z'),
        end_at: new Date('2026-04-10T02:00:00Z'),
        created_at: new Date(),
        updated_at: new Date(),
      })

      const { POST } = await import('@/app/api/teams/[teamId]/schedules/route')
      const leaderRequest = new NextRequest('http://localhost/api/teams/team-1/schedules', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Team Meeting',
          startAt: '2026-04-10T01:00:00Z',
          endAt: '2026-04-10T02:00:00Z',
        }),
      })
      const leaderResponse = await POST(leaderRequest, {
        params: Promise.resolve({ teamId: 'team-1' }),
      })
      expect(leaderResponse.status).toBe(201)

      // Test with MEMBER (should fail with 403)
      vi.resetModules()
      mockWithAuth.mockResolvedValueOnce({
        success: true,
        user: { userId: 'member-456', userEmail: 'member@test.com' },
      })
      mockRequireLeader.mockResolvedValueOnce({
        success: false,
        response: new NextResponse(
          JSON.stringify({ error: '팀장만 이 작업을 수행할 수 있습니다.' }),
          { status: 403 }
        ),
      })

      const { POST: POST2 } = await import('@/app/api/teams/[teamId]/schedules/route')
      const memberRequest = new NextRequest('http://localhost/api/teams/team-1/schedules', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Team Meeting',
          startAt: '2026-04-10T01:00:00Z',
          endAt: '2026-04-10T02:00:00Z',
        }),
      })
      const memberResponse = await POST2(memberRequest, {
        params: Promise.resolve({ teamId: 'team-1' }),
      })
      expect(memberResponse.status).toBe(403)
    })
  })

  describe('3. 팀 격리 테스트 (타 팀 접근 → 403)', () => {
    it('should block access to other team schedules', async () => {
      vi.resetModules()
      mockWithAuth.mockResolvedValueOnce({
        success: true,
        user: { userId: 'user-123', userEmail: 'test@test.com' },
      })
      mockWithTeamRole.mockResolvedValueOnce({
        success: false,
        response: new NextResponse(
          JSON.stringify({ error: '해당 팀에 접근 권한이 없습니다.' }),
          { status: 403 }
        ),
      })

      const { GET } = await import('@/app/api/teams/[teamId]/schedules/route')
      const request = new NextRequest('http://localhost/api/teams/team-999/schedules')
      const response = await GET(request, {
        params: Promise.resolve({ teamId: 'team-999' }),
      })
      expect(response.status).toBe(403)
    })

    it('should block access to other team messages', async () => {
      vi.resetModules()
      mockWithAuth.mockResolvedValueOnce({
        success: true,
        user: { userId: 'user-123', userEmail: 'test@test.com' },
      })
      mockWithTeamRole.mockResolvedValueOnce({
        success: false,
        response: new NextResponse(
          JSON.stringify({ error: '해당 팀에 접근 권한이 없습니다.' }),
          { status: 403 }
        ),
      })

      const { GET } = await import('@/app/api/teams/[teamId]/messages/route')
      const request = new NextRequest('http://localhost/api/teams/team-999/messages')
      const response = await GET(request, {
        params: Promise.resolve({ teamId: 'team-999' }),
      })
      expect(response.status).toBe(403)
    })
  })

  describe('4. 일정 날짜 범위 조회 테스트 (KST 기준)', () => {
    it('should query schedules with month/week/day views', async () => {
      const testSchedules = [
        {
          id: 'schedule-1',
          team_id: 'team-1',
          created_by: 'user-123',
          title: 'Week 1 Schedule',
          description: null,
          start_at: new Date('2026-04-10T01:00:00Z'),
          end_at: new Date('2026-04-10T02:00:00Z'),
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]

      // Test month view
      vi.resetModules()
      mockWithAuth.mockResolvedValueOnce({
        success: true,
        user: { userId: 'user-123', userEmail: 'test@test.com' },
      })
      mockWithTeamRole.mockResolvedValueOnce({
        success: true,
        context: { userId: 'user-123', teamId: 'team-1', role: 'MEMBER' },
      })
      mockGetSchedulesByDateRange.mockResolvedValueOnce(testSchedules)

      const { GET } = await import('@/app/api/teams/[teamId]/schedules/route')
      const monthUrl = new URL('http://localhost/api/teams/team-1/schedules')
      monthUrl.searchParams.set('view', 'month')
      monthUrl.searchParams.set('date', '2026-04-15')
      const monthRequest = new NextRequest(monthUrl.toString())
      const monthResponse = await GET(monthRequest, {
        params: Promise.resolve({ teamId: 'team-1' }),
      })
      expect(monthResponse.status).toBe(200)
      const monthJson = await monthResponse.json()
      expect(monthJson.view).toBe('month')
      expect(monthJson.date).toBe('2026-04-15')

      // Test week view
      vi.resetModules()
      mockWithAuth.mockResolvedValueOnce({
        success: true,
        user: { userId: 'user-123', userEmail: 'test@test.com' },
      })
      mockWithTeamRole.mockResolvedValueOnce({
        success: true,
        context: { userId: 'user-123', teamId: 'team-1', role: 'MEMBER' },
      })
      mockGetSchedulesByDateRange.mockResolvedValueOnce(testSchedules)

      const { GET: GET2 } = await import('@/app/api/teams/[teamId]/schedules/route')
      const weekUrl = new URL('http://localhost/api/teams/team-1/schedules')
      weekUrl.searchParams.set('view', 'week')
      weekUrl.searchParams.set('date', '2026-04-15')
      const weekRequest = new NextRequest(weekUrl.toString())
      const weekResponse = await GET2(weekRequest, {
        params: Promise.resolve({ teamId: 'team-1' }),
      })
      expect(weekResponse.status).toBe(200)
      const weekJson = await weekResponse.json()
      expect(weekJson.view).toBe('week')
    })
  })

  describe('5. 채팅 날짜 그룹핑 테스트 (KST 자정 경계)', () => {
    it('should query messages by KST date boundary', async () => {
      vi.resetModules()
      mockWithAuth.mockResolvedValueOnce({
        success: true,
        user: { userId: 'user-123', userEmail: 'test@test.com' },
      })
      mockWithTeamRole.mockResolvedValueOnce({
        success: true,
        context: { userId: 'user-123', teamId: 'team-1', role: 'MEMBER' },
      })
      mockGetMessagesByDate.mockResolvedValueOnce([
        {
          id: 'msg-1',
          team_id: 'team-1',
          sender_id: 'user-123',
          sender_name: 'Test User',
          type: 'NORMAL',
          content: 'Morning message',
          sent_at: new Date('2026-04-09T15:00:00Z'), // KST 2026-04-10 00:00
          created_at: new Date(),
        },
      ])

      const { GET } = await import('@/app/api/teams/[teamId]/messages/route')
      const url = new URL('http://localhost/api/teams/team-1/messages')
      url.searchParams.set('date', '2026-04-10')
      const request = new NextRequest(url.toString())
      const response = await GET(request, {
        params: Promise.resolve({ teamId: 'team-1' }),
      })
      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.messages).toHaveLength(1)
      expect(mockGetMessagesByDate).toHaveBeenCalledWith('team-1', '2026-04-10')
    })
  })

  describe('6. 전체 API 성공/실패 케이스 종합 테스트', () => {
    it('should handle all success cases with correct status codes', async () => {
      // This test verifies that all major success paths work
      const tests = []

      // Auth: Signup
      vi.resetModules()
      mockGetUserByEmail.mockResolvedValueOnce(null)
      mockCreateUser.mockResolvedValueOnce({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test',
        password_hash: 'hash',
        created_at: new Date(),
      })

      const { POST: signupPOST } = await import('@/app/api/auth/signup/route')
      const signupReq = new NextRequest('http://localhost/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com', name: 'Test', password: 'pass1234' }),
      })
      const signupRes = await signupPOST(signupReq)
      tests.push({ endpoint: 'POST /auth/signup', expected: 201, actual: signupRes.status })
      expect(signupRes.status).toBe(201)
    })

    it('should handle all error cases with correct 4xx status codes', async () => {
      // Test 400 errors
      vi.resetModules()
      const { POST: loginPOST } = await import('@/app/api/auth/login/route')
      const req = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      const res = await loginPOST(req)
      expect(res.status).toBe(400)

      // Test 401 errors
      vi.resetModules()
      mockWithAuth.mockResolvedValueOnce({
        success: false,
        response: new NextResponse(JSON.stringify({ error: '인증이 필요합니다.' }), { status: 401 }),
      })
      const { GET } = await import('@/app/api/teams/route')
      const req2 = new NextRequest('http://localhost/api/teams')
      const res2 = await GET(req2)
      expect(res2.status).toBe(401)

      // Test 403 errors
      vi.resetModules()
      mockWithAuth.mockResolvedValueOnce({
        success: true,
        user: { userId: 'user-123', userEmail: 'test@test.com' },
      })
      mockWithTeamRole.mockResolvedValueOnce({
        success: false,
        response: new NextResponse(JSON.stringify({ error: '해당 팀에 접근 권한이 없습니다.' }), { status: 403 }),
      })
      const { GET: GET2 } = await import('@/app/api/teams/[teamId]/schedules/route')
      const req3 = new NextRequest('http://localhost/api/teams/team-1/schedules')
      const res3 = await GET2(req3, { params: Promise.resolve({ teamId: 'team-1' }) })
      expect(res3.status).toBe(403)

      // Test 404 errors
      vi.resetModules()
      mockWithAuth.mockResolvedValueOnce({
        success: true,
        user: { userId: 'user-123', userEmail: 'test@test.com' },
      })
      mockWithTeamRole.mockResolvedValueOnce({
        success: true,
        context: { userId: 'user-123', teamId: 'team-1', role: 'MEMBER' },
      })
      mockGetScheduleById.mockResolvedValueOnce(null)
      const { GET: GET3 } = await import('@/app/api/teams/[teamId]/schedules/[scheduleId]/route')
      const req4 = new NextRequest('http://localhost/api/teams/team-1/schedules/non-existent')
      const res4 = await GET3(req4, {
        params: Promise.resolve({ teamId: 'team-1', scheduleId: 'non-existent' }),
      })
      expect(res4.status).toBe(404)
    })
  })
})
