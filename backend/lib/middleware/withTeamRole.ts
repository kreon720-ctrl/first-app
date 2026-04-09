import { NextRequest, NextResponse } from 'next/server'
import { getUserTeamRole } from '@/lib/db/queries/teamQueries'

export type TeamRole = 'LEADER' | 'MEMBER'

export interface TeamRoleContext {
  userId: string
  teamId: string
  role: TeamRole | null
}

/**
 * Middleware to verify user's team role
 * Must be used after withAuth (user must be authenticated)
 * 
 * Usage:
 * ```typescript
 * export async function GET(request: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
 *   const authResult = await withAuth(request)
 *   if (!authResult.success) return authResult.response
 * 
 *   const { teamId } = await params
 *   const roleResult = await withTeamRole(authResult.user.userId, teamId)
 *   if (!roleResult.success) return roleResult.response
 * 
 *   // ... protected logic with role context
 * }
 * ```
 */
export async function withTeamRole(
  userId: string,
  teamId: string
): Promise<
  | { success: true; context: TeamRoleContext }
  | { success: false; response: NextResponse }
> {
  const role = await getUserTeamRole(teamId, userId)

  if (!role) {
    return {
      success: false,
      response: NextResponse.json(
        { error: '해당 팀에 접근 권한이 없습니다.' },
        { status: 403 }
      ),
    }
  }

  return {
    success: true,
    context: {
      userId,
      teamId,
      role,
    },
  }
}

/**
 * Middleware to check if user is a team leader
 * 
 * Usage:
 * ```typescript
 * const leaderResult = await requireLeader(authResult.user.userId, teamId)
 * if (!leaderResult.success) return leaderResult.response
 * // User is guaranteed to be LEADER
 * ```
 */
export async function requireLeader(
  userId: string,
  teamId: string
): Promise<
  | { success: true; context: TeamRoleContext }
  | { success: false; response: NextResponse }
> {
  const roleResult = await withTeamRole(userId, teamId)

  if (!roleResult.success) {
    return roleResult
  }

  if (roleResult.context.role !== 'LEADER') {
    return {
      success: false,
      response: NextResponse.json(
        { error: '팀장만 이 작업을 수행할 수 있습니다.' },
        { status: 403 }
      ),
    }
  }

  return roleResult
}
