import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { JoinRequest } from '@/types/team';

export function useUpdateJoinRequestFromTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId,
      requestId,
      action,
    }: {
      teamId: string;
      requestId: string;
      action: 'APPROVE' | 'REJECT';
    }): Promise<JoinRequest> => {
      return apiClient.patch<JoinRequest>(
        `/api/teams/${teamId}/join-requests/${requestId}`,
        { action }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
    },
  });
}
