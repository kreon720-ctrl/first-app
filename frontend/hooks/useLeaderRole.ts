'use client';

import { useTeamDetail } from '@/hooks/query/useTeams';

/**
 * Hook to check if the current user is a LEADER in a specific team.
 * Returns isLeader flag and the team detail data.
 */
export function useLeaderRole(teamId: string) {
  const { data: team, isLoading, isError } = useTeamDetail(teamId);

  const isLeader = team?.myRole === 'LEADER';

  return {
    isLeader,
    role: team?.myRole ?? null,
    team,
    isLoading,
    isError,
  };
}
