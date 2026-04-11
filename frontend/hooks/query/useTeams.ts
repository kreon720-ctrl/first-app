import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { Team, PublicTeam, TeamDetail, TeamCreateInput, TeamUpdateInput } from '@/types/team';

export function useMyTeams() {
  return useQuery({
    queryKey: ['teams', 'my'],
    queryFn: async (): Promise<{ teams: Team[] }> => {
      return apiClient.get<{ teams: Team[] }>('/api/teams');
    },
  });
}

export function usePublicTeams() {
  return useQuery({
    queryKey: ['teams', 'public'],
    queryFn: async (): Promise<{ teams: PublicTeam[] }> => {
      return apiClient.get<{ teams: PublicTeam[] }>('/api/teams/public');
    },
  });
}

export function useTeamDetail(teamId: string) {
  return useQuery({
    queryKey: ['teams', teamId],
    queryFn: async (): Promise<TeamDetail> => {
      return apiClient.get<TeamDetail>(`/api/teams/${teamId}`);
    },
    enabled: !!teamId,
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TeamCreateInput): Promise<Team> => {
      return apiClient.post<Team>('/api/teams', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams', 'my'] });
    },
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teamId, data }: { teamId: string; data: TeamUpdateInput }): Promise<Team> => {
      return apiClient.patch<Team>(`/api/teams/${teamId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams', 'my'] });
    },
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (teamId: string): Promise<void> => {
      return apiClient.delete<void>(`/api/teams/${teamId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams', 'my'] });
    },
  });
}
