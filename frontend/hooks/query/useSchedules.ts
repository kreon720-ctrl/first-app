import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type {
  Schedule,
  ScheduleCreateInput,
  ScheduleUpdateInput,
  ScheduleQueryParams,
  ScheduleListResponse,
} from '@/types/schedule';

export function useSchedules(teamId: string, params?: ScheduleQueryParams) {
  const queryParams = new URLSearchParams();
  if (params?.view) queryParams.set('view', params.view);
  if (params?.date) queryParams.set('date', params.date);

  const queryKey = ['schedules', teamId, params];

  return useQuery({
    queryKey,
    queryFn: async (): Promise<ScheduleListResponse> => {
      return apiClient.get<ScheduleListResponse>(
        `/api/teams/${teamId}/schedules?${queryParams.toString()}`
      );
    },
    enabled: !!teamId,
  });
}

export function useScheduleDetail(teamId: string, scheduleId: string) {
  return useQuery({
    queryKey: ['schedules', teamId, scheduleId],
    queryFn: async (): Promise<Schedule> => {
      return apiClient.get<Schedule>(
        `/api/teams/${teamId}/schedules/${scheduleId}`
      );
    },
    enabled: !!teamId && !!scheduleId,
  });
}

export function useCreateSchedule(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ScheduleCreateInput): Promise<Schedule> => {
      return apiClient.post<Schedule>(
        `/api/teams/${teamId}/schedules`,
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules', teamId] });
    },
  });
}

export function useUpdateSchedule(teamId: string, scheduleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ScheduleUpdateInput): Promise<Schedule> => {
      return apiClient.patch<Schedule>(
        `/api/teams/${teamId}/schedules/${scheduleId}`,
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules', teamId] });
      queryClient.invalidateQueries({
        queryKey: ['schedules', teamId, scheduleId],
      });
    },
  });
}

export function useDeleteSchedule(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (scheduleId: string): Promise<void> => {
      return apiClient.delete<void>(
        `/api/teams/${teamId}/schedules/${scheduleId}`
      );
    },
    onSuccess: (_, scheduleId) => {
      queryClient.invalidateQueries({ queryKey: ['schedules', teamId] });
      queryClient.invalidateQueries({
        queryKey: ['schedules', teamId, scheduleId],
      });
    },
  });
}
