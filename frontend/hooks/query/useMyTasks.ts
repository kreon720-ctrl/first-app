import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { JoinRequestStatus } from '@/types/team';

// API 명세 GET /api/me/tasks 응답의 tasks[] 항목
export interface MyTask {
  id: string;
  teamId: string;
  teamName: string;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  status: JoinRequestStatus;
  requestedAt: string;
  respondedAt: string | null;
}

export interface MyTasksResponse {
  totalPendingCount: number;
  tasks: MyTask[];
}

export function useMyTasks() {
  return useQuery({
    queryKey: ['myTasks'],
    queryFn: async (): Promise<MyTasksResponse> => {
      return apiClient.get<MyTasksResponse>('/api/me/tasks');
    },
  });
}
