import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

interface WorkPermissionsResponse {
  permittedUserIds: string[];
}

export function useWorkPermissions(teamId: string) {
  return useQuery({
    queryKey: ['work-permissions', teamId],
    queryFn: async (): Promise<WorkPermissionsResponse> => {
      return apiClient.get<WorkPermissionsResponse>(
        `/api/teams/${teamId}/work-permissions`
      );
    },
    enabled: !!teamId,
  });
}

export function useSetWorkPermissions(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userIds: string[]): Promise<WorkPermissionsResponse> => {
      return apiClient.patch<WorkPermissionsResponse>(
        `/api/teams/${teamId}/work-permissions`,
        { userIds }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-permissions', teamId] });
    },
  });
}
