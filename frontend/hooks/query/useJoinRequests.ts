import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { JoinRequest, JoinRequestAction } from '@/types/team';

export function useJoinRequests(teamId: string) {
  return useQuery({
    queryKey: ['joinRequests', teamId],
    queryFn: async (): Promise<{ joinRequests: JoinRequest[] }> => {
      return apiClient.get<{ joinRequests: JoinRequest[] }>(
        `/api/teams/${teamId}/join-requests`
      );
    },
    enabled: !!teamId,
  });
}

export function useSubmitJoinRequest(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<JoinRequest> => {
      return apiClient.post<JoinRequest>(
        `/api/teams/${teamId}/join-requests`,
        {}
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams', 'public'] });
    },
  });
}

export function useUpdateJoinRequest(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      action,
    }: {
      requestId: string;
      action: JoinRequestAction;
    }): Promise<JoinRequest> => {
      return apiClient.patch<JoinRequest>(
        `/api/teams/${teamId}/join-requests/${requestId}`,
        { action }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['joinRequests', teamId] });
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
    },
  });
}
