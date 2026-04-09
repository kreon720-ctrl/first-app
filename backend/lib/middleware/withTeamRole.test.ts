import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { withTeamRole, requireLeader, TeamRoleContext } from '@/lib/middleware/withTeamRole'
import * as teamQueries from '@/lib/db/queries/teamQueries'

// Mock the database query module
vi.mock('@/lib/db/queries/teamQueries', () => ({
  getUserTeamRole: vi.fn(),
}))

const mockGetUserTeamRole = vi.mocked(teamQueries.getUserTeamRole)

describe('BE-06: withTeamRole Middleware', () => {
  const testUserId = 'user-123'
  const testTeamId = 'team-456'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('withTeamRole', () => {
    it('should return LEADER role when user is team leader', async () => {
      mockGetUserTeamRole.mockResolvedValueOnce('LEADER')

      const result = await withTeamRole(testUserId, testTeamId)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.context.userId).toBe(testUserId)
        expect(result.context.teamId).toBe(testTeamId)
        expect(result.context.role).toBe('LEADER')
      }

      expect(mockGetUserTeamRole).toHaveBeenCalledWith(testTeamId, testUserId)
      expect(mockGetUserTeamRole).toHaveBeenCalledTimes(1)
    })

    it('should return MEMBER role when user is team member', async () => {
      mockGetUserTeamRole.mockResolvedValueOnce('MEMBER')

      const result = await withTeamRole(testUserId, testTeamId)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.context.role).toBe('MEMBER')
      }
    })

    it('should return 403 when user is not a team member (null)', async () => {
      mockGetUserTeamRole.mockResolvedValueOnce(null)

      const result = await withTeamRole(testUserId, testTeamId)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.response.status).toBe(403)
        const json = await result.response.json()
        expect(json.error).toBe('해당 팀에 접근 권한이 없습니다.')
      }
    })

    it('should call getUserTeamRole with correct parameters', async () => {
      mockGetUserTeamRole.mockResolvedValueOnce('MEMBER')

      const userId = 'specific-user-id'
      const teamId = 'specific-team-id'

      await withTeamRole(userId, teamId)

      expect(mockGetUserTeamRole).toHaveBeenCalledWith(teamId, userId)
    })

    it('should handle different user and team IDs', async () => {
      const testCases: Array<{ userId: string; teamId: string; role: 'LEADER' | 'MEMBER' }> = [
        { userId: 'user-1', teamId: 'team-1', role: 'LEADER' },
        { userId: 'user-2', teamId: 'team-1', role: 'MEMBER' },
        { userId: 'user-3', teamId: 'team-2', role: 'LEADER' },
      ]

      for (const testCase of testCases) {
        mockGetUserTeamRole.mockResolvedValueOnce(testCase.role)

        const result = await withTeamRole(testCase.userId, testCase.teamId)

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.context.userId).toBe(testCase.userId)
          expect(result.context.teamId).toBe(testCase.teamId)
          expect(result.context.role).toBe(testCase.role)
        }
      }
    })

    it('should return context with all required fields on success', async () => {
      mockGetUserTeamRole.mockResolvedValueOnce('MEMBER')

      const result = await withTeamRole(testUserId, testTeamId)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.context).toHaveProperty('userId')
        expect(result.context).toHaveProperty('teamId')
        expect(result.context).toHaveProperty('role')
        expect(Object.keys(result.context)).toHaveLength(3)
      }
    })

    it('should handle database returning null for non-member', async () => {
      mockGetUserTeamRole.mockResolvedValueOnce(null)

      const result = await withTeamRole('non-member-user', 'some-team')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.response.status).toBe(403)
      }
    })
  })

  describe('requireLeader', () => {
    it('should return success when user is LEADER', async () => {
      mockGetUserTeamRole.mockResolvedValueOnce('LEADER')

      const result = await requireLeader(testUserId, testTeamId)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.context.role).toBe('LEADER')
      }
    })

    it('should return 403 when user is MEMBER (not leader)', async () => {
      mockGetUserTeamRole.mockResolvedValueOnce('MEMBER')

      const result = await requireLeader(testUserId, testTeamId)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.response.status).toBe(403)
        const json = await result.response.json()
        expect(json.error).toBe('팀장만 이 작업을 수행할 수 있습니다.')
      }
    })

    it('should return 403 when user is not a team member', async () => {
      mockGetUserTeamRole.mockResolvedValueOnce(null)

      const result = await requireLeader(testUserId, testTeamId)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.response.status).toBe(403)
        const json = await result.response.json()
        expect(json.error).toBe('해당 팀에 접근 권한이 없습니다.')
      }
    })

    it('should call withTeamRole internally', async () => {
      mockGetUserTeamRole.mockResolvedValueOnce('LEADER')

      await requireLeader(testUserId, testTeamId)

      expect(mockGetUserTeamRole).toHaveBeenCalledWith(testTeamId, testUserId)
    })

    it('should short-circuit when user is not a member', async () => {
      mockGetUserTeamRole.mockResolvedValueOnce(null)

      const result = await requireLeader(testUserId, testTeamId)

      expect(result.success).toBe(false)
      if (!result.success) {
        // Should return the 403 from withTeamRole, not the leader-specific message
        const json = await result.response.json()
        expect(json.error).toBe('해당 팀에 접근 권한이 없습니다.')
      }
    })

    it('should handle multiple sequential requireLeader calls', async () => {
      const scenarios: Array<{ userId: string; teamId: string; expectedRole: 'LEADER' | 'MEMBER' | null; shouldSucceed: boolean }> = [
        { userId: 'leader-1', teamId: 'team-1', expectedRole: 'LEADER', shouldSucceed: true },
        { userId: 'member-1', teamId: 'team-1', expectedRole: 'MEMBER', shouldSucceed: false },
        { userId: 'non-member', teamId: 'team-1', expectedRole: null, shouldSucceed: false },
      ]

      for (const scenario of scenarios) {
        mockGetUserTeamRole.mockResolvedValueOnce(scenario.expectedRole)

        const result = await requireLeader(scenario.userId, scenario.teamId)

        expect(result.success).toBe(scenario.shouldSucceed)
      }
    })
  })

  describe('Integration scenarios (simulating API route usage)', () => {
    it('should work with withAuth + withTeamRole chain for team detail access', async () => {
      // Simulate: User authenticated, checking team membership
      mockGetUserTeamRole.mockResolvedValueOnce('MEMBER')

      // Simulated API route logic
      const userId = 'authenticated-user'
      const teamId = 'team-to-access'

      // Step 1: withAuth would have validated (simulated)
      const authSuccess = true
      const authUserId = userId

      // Step 2: withTeamRole
      const roleResult = await withTeamRole(authUserId, teamId)

      expect(roleResult.success).toBe(true)
      if (roleResult.success) {
        expect(roleResult.context.role).toBe('MEMBER')
        expect(roleResult.context.userId).toBe(authUserId)
        expect(roleResult.context.teamId).toBe(teamId)
      }
    })

    it('should block non-team-member from accessing team resources', async () => {
      mockGetUserTeamRole.mockResolvedValueOnce(null)

      const userId = 'random-user'
      const teamId = 'private-team'

      const roleResult = await withTeamRole(userId, teamId)

      expect(roleResult.success).toBe(false)
      if (!roleResult.success) {
        expect(roleResult.response.status).toBe(403)
      }
    })

    it('should allow LEADER to perform admin actions', async () => {
      mockGetUserTeamRole.mockResolvedValueOnce('LEADER')

      const userId = 'team-leader'
      const teamId = 'admin-team'

      const leaderResult = await requireLeader(userId, teamId)

      expect(leaderResult.success).toBe(true)
      if (leaderResult.success) {
        expect(leaderResult.context.role).toBe('LEADER')
        // Leader can now perform admin actions
      }
    })

    it('should prevent MEMBER from performing admin actions', async () => {
      mockGetUserTeamRole.mockResolvedValueOnce('MEMBER')

      const userId = 'team-member'
      const teamId = 'restricted-team'

      const leaderResult = await requireLeader(userId, teamId)

      expect(leaderResult.success).toBe(false)
      if (!leaderResult.success) {
        expect(leaderResult.response.status).toBe(403)
      }
    })
  })

  describe('Edge cases', () => {
    it('should handle empty string userId', async () => {
      mockGetUserTeamRole.mockResolvedValueOnce(null)

      const result = await withTeamRole('', testTeamId)

      expect(result.success).toBe(false)
      expect(mockGetUserTeamRole).toHaveBeenCalledWith(testTeamId, '')
    })

    it('should handle empty string teamId', async () => {
      mockGetUserTeamRole.mockResolvedValueOnce(null)

      const result = await withTeamRole(testUserId, '')

      expect(result.success).toBe(false)
      expect(mockGetUserTeamRole).toHaveBeenCalledWith('', testUserId)
    })

    it('should handle UUID-formatted IDs', async () => {
      const uuidUserId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
      const uuidTeamId = 'b1c2d3e4-f5a6-7890-bcde-fa1234567890'

      mockGetUserTeamRole.mockResolvedValueOnce('MEMBER')

      const result = await withTeamRole(uuidUserId, uuidTeamId)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.context.userId).toBe(uuidUserId)
        expect(result.context.teamId).toBe(uuidTeamId)
      }
    })

    it('should handle database query failure', async () => {
      mockGetUserTeamRole.mockRejectedValueOnce(new Error('Database connection failed'))

      await expect(withTeamRole(testUserId, testTeamId)).rejects.toThrow(
        'Database connection failed'
      )
    })

    it('should handle requireLeader with same user and team multiple times', async () => {
      mockGetUserTeamRole
        .mockResolvedValueOnce('LEADER')
        .mockResolvedValueOnce('LEADER')
        .mockResolvedValueOnce('LEADER')

      const result1 = await requireLeader(testUserId, testTeamId)
      const result2 = await requireLeader(testUserId, testTeamId)
      const result3 = await requireLeader(testUserId, testTeamId)

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
      expect(result3.success).toBe(true)
      expect(mockGetUserTeamRole).toHaveBeenCalledTimes(3)
    })
  })

  describe('Type safety and return structure', () => {
    it('should return correct TeamRoleContext structure on success', async () => {
      mockGetUserTeamRole.mockResolvedValueOnce('LEADER')

      const result = await withTeamRole(testUserId, testTeamId)

      if (result.success) {
        // TypeScript should guarantee these fields exist
        const userId: string = result.context.userId
        const teamId: string = result.context.teamId
        const role: 'LEADER' | 'MEMBER' = result.context.role!

        expect(typeof userId).toBe('string')
        expect(typeof teamId).toBe('string')
        expect(['LEADER', 'MEMBER']).toContain(role)
      }
    })

    it('should return NextResponse on failure', async () => {
      mockGetUserTeamRole.mockResolvedValueOnce(null)

      const result = await withTeamRole(testUserId, testTeamId)

      if (!result.success) {
        expect(result.response).toBeInstanceOf(Response)
        expect(result.response.status).toBe(403)
      }
    })
  })
})
