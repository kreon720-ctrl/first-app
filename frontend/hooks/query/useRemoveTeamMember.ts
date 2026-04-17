import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

export function useRemoveTeamMember(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string): Promise<void> => {
      return apiClient.delete(`/api/teams/${teamId}/members/${userId}`);
    },
    onSuccess: () => {
      // 팀 상세(멤버 목록) 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['teams', teamId] });
    },
  });
}
