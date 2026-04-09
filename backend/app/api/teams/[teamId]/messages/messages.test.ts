import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Mock middleware and database queries
vi.mock('@/lib/middleware/withAuth', () => ({
  withAuth: vi.fn(),
}))

vi.mock('@/lib/middleware/withTeamRole', () => ({
  withTeamRole: vi.fn(),
}))

vi.mock('@/lib/db/queries/chatQueries', () => ({
  getMessagesByDate: vi.fn(),
  getMessagesByTeam: vi.fn(),
  createChatMessage: vi.fn(),
}))

// Import mocked modules
import * as withAuthModule from '@/lib/middleware/withAuth'
import * as withTeamRoleModule from '@/lib/middleware/withTeamRole'
import * as chatQueries from '@/lib/db/queries/chatQueries'

const mockWithAuth = vi.mocked(withAuthModule.withAuth)
const mockWithTeamRole = vi.mocked(withTeamRoleModule.withTeamRole)
const mockGetMessagesByDate = vi.mocked(chatQueries.getMessagesByDate)
const mockGetMessagesByTeam = vi.mocked(chatQueries.getMessagesByTeam)
const mockCreateChatMessage = vi.mocked(chatQueries.createChatMessage)

describe('BE-12: Chat APIs', () => {
  const testUser = { userId: 'user-123', userEmail: 'test@example.com' }
  const testTeamId = 'team-456'
  const testMessage = {
    id: 'msg-1',
    team_id: testTeamId,
    sender_id: 'user-123',
    sender_name: 'Test User',
    type: 'NORMAL' as const,
    content: 'Hello, team!',
    sent_at: new Date('2026-04-10T01:00:00Z'),
    created_at: new Date('2026-04-10T01:00:00Z'),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/teams/:teamId/messages', () => {
    const endpoint = async (
      teamId: string,
      authSuccess = true,
      queryParams: Record<string, string> = {}
    ) => {
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

        const date = queryParams.date
        if (date) {
          mockGetMessagesByDate.mockResolvedValueOnce([testMessage])
        } else {
          mockGetMessagesByTeam.mockResolvedValueOnce([testMessage])
        }
      }

      const { GET } = await import('@/app/api/teams/[teamId]/messages/route')
      const url = new URL(`http://localhost/api/teams/${teamId}/messages`)
      Object.entries(queryParams).forEach(([key, value]) => {
        url.searchParams.set(key, value)
      })
      const request = new NextRequest(url.toString())
      return GET(request, { params: Promise.resolve({ teamId }) })
    }

    it('should return messages by date (KST)', async () => {
      const response = await endpoint(testTeamId, true, { date: '2026-04-10' })
      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.messages).toHaveLength(1)
      expect(json.messages[0]).toHaveProperty('senderName', 'Test User')
      expect(mockGetMessagesByDate).toHaveBeenCalledWith(testTeamId, '2026-04-10')
    })

    it('should return latest messages without date param', async () => {
      const response = await endpoint(testTeamId, true, {})
      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.messages).toHaveLength(1)
      expect(mockGetMessagesByTeam).toHaveBeenCalledWith(testTeamId, 50, undefined)
    })

    it('should respect limit parameter', async () => {
      const response = await endpoint(testTeamId, true, { limit: '20' })
      expect(response.status).toBe(200)
      expect(mockGetMessagesByTeam).toHaveBeenCalledWith(testTeamId, 20, undefined)
    })

    it('should respect before cursor parameter', async () => {
      const beforeDate = '2026-04-09T23:59:59Z'
      const response = await endpoint(testTeamId, true, { before: beforeDate })
      expect(response.status).toBe(200)
      expect(mockGetMessagesByTeam).toHaveBeenCalledWith(
        testTeamId,
        50,
        new Date(beforeDate)
      )
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

      const { GET } = await import('@/app/api/teams/[teamId]/messages/route')
      const request = new NextRequest('http://localhost/api/teams/team-456/messages')
      const response = await GET(request, { params: Promise.resolve({ teamId: testTeamId }) })

      expect(response.status).toBe(403)
    })
  })

  describe('POST /api/teams/:teamId/messages', () => {
    const endpoint = async (
      teamId: string,
      body: any,
      authSuccess = true
    ) => {
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

        if (body?.content) {
          mockCreateChatMessage.mockResolvedValueOnce({
            ...testMessage,
            content: body.content,
            type: body.type || 'NORMAL',
          })
        }
      }

      const { POST } = await import('@/app/api/teams/[teamId]/messages/route')
      const request = new NextRequest(`http://localhost/api/teams/${teamId}/messages`, {
        method: 'POST',
        body: JSON.stringify(body),
      })
      return POST(request, { params: Promise.resolve({ teamId }) })
    }

    it('should send NORMAL message successfully', async () => {
      const response = await endpoint(testTeamId, {
        content: 'Hello, team!',
      }, true)

      expect(response.status).toBe(201)
      const json = await response.json()
      expect(json.content).toBe('Hello, team!')
      expect(json.type).toBe('NORMAL')
      expect(mockCreateChatMessage).toHaveBeenCalledWith({
        teamId: testTeamId,
        senderId: testUser.userId,
        type: 'NORMAL',
        content: 'Hello, team!',
        sentAt: expect.any(Date),
      })
    })

    it('should send SCHEDULE_REQUEST message', async () => {
      const response = await endpoint(testTeamId, {
        type: 'SCHEDULE_REQUEST',
        content: 'Please change the meeting time.',
      }, true)

      expect(response.status).toBe(201)
      const json = await response.json()
      expect(json.type).toBe('SCHEDULE_REQUEST')
      expect(mockCreateChatMessage).toHaveBeenCalledWith({
        teamId: testTeamId,
        senderId: testUser.userId,
        type: 'SCHEDULE_REQUEST',
        content: 'Please change the meeting time.',
        sentAt: expect.any(Date),
      })
    })

    it('should return 400 when content is missing', async () => {
      const response = await endpoint(testTeamId, {}, true)
      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toBe('메시지 내용은 필수입니다.')
    })

    it('should return 400 when content exceeds 2000 chars', async () => {
      const response = await endpoint(testTeamId, {
        content: 'A'.repeat(2001),
      }, true)

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toBe('메시지는 최대 2000자까지 입력 가능합니다.')
    })

    it('should return 400 for invalid message type', async () => {
      const response = await endpoint(testTeamId, {
        type: 'INVALID_TYPE',
        content: 'Test message',
      }, true)

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toBe('잘못된 메시지 타입입니다.')
    })

    it('should return 401 when not authenticated', async () => {
      const response = await endpoint(testTeamId, {
        content: 'Hello',
      }, false)

      expect(response.status).toBe(401)
    })

    it('should return 403 when user is not a team member', async () => {
      vi.resetModules()
      mockWithAuth.mockResolvedValueOnce({ success: true, user: testUser })
      mockWithTeamRole.mockResolvedValueOnce({
        success: false,
        response: new NextResponse(JSON.stringify({ error: '해당 팀에 접근 권한이 없습니다.' }), { status: 403 }),
      })

      const { POST } = await import('@/app/api/teams/[teamId]/messages/route')
      const request = new NextRequest(`http://localhost/api/teams/${testTeamId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: 'Hello' }),
      })
      const response = await POST(request, { params: Promise.resolve({ teamId: testTeamId }) })

      expect(response.status).toBe(403)
    })
  })
})
