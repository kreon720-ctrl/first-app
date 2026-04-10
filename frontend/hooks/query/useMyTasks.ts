import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { JoinRequest } from '@/types/team';

export interface MyTask {
  id: string;
  teamId: string;
  teamName: string;
  joinRequest: JoinRequest;
}

export function useMyTasks() {
  return useQuery({
    queryKey: ['myTasks'],
    queryFn: async (): Promise<{ tasks: MyTask[] }> => {
      return apiClient.get<{ tasks: MyTask[] }>('/api/me/tasks');
    },
  });
}
