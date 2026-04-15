import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { PostIt, PostItCreateInput, PostItListResponse } from '@/types/postit';

export function usePostits(teamId: string, month: string) {
  return useQuery({
    queryKey: ['postits', teamId, month],
    queryFn: () =>
      apiClient.get<PostItListResponse>(
        `/api/teams/${teamId}/postits?month=${month}`
      ),
    enabled: !!teamId && !!month,
  });
}

export function useCreatePostit(teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PostItCreateInput) =>
      apiClient.post<PostIt>(`/api/teams/${teamId}/postits`, data),
    onSuccess: (postit) => {
      const month = postit.date.slice(0, 7);
      queryClient.invalidateQueries({ queryKey: ['postits', teamId, month] });
    },
  });
}

export function useUpdatePostitContent(teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postitId, content }: { postitId: string; content: string }) =>
      apiClient.patch<PostIt>(`/api/teams/${teamId}/postits/${postitId}`, { content }),
    onSuccess: (postit) => {
      const month = postit.date.slice(0, 7);
      queryClient.invalidateQueries({ queryKey: ['postits', teamId, month] });
    },
  });
}

export function useDeletePostit(teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postitId, date }: { postitId: string; date: string }) =>
      apiClient.delete<void>(`/api/teams/${teamId}/postits/${postitId}`)
        .then(() => ({ date })),
    onSuccess: ({ date }) => {
      const month = date.slice(0, 7);
      queryClient.invalidateQueries({ queryKey: ['postits', teamId, month] });
    },
  });
}
