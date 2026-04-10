import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type {
  ChatMessage,
  ChatMessageInput,
  ChatMessageListResponse,
} from '@/types/chat';

export function useMessages(teamId: string, date?: string) {
  return useQuery({
    queryKey: ['messages', teamId, date],
    queryFn: async (): Promise<ChatMessageListResponse> => {
      const params = date ? `?date=${date}` : '';
      return apiClient.get<ChatMessageListResponse>(
        `/api/teams/${teamId}/messages${params}`
      );
    },
    enabled: !!teamId,
    refetchInterval: 3000, // Poll every 3 seconds for new messages
  });
}

export function useSendMessage(teamId: string, date?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: ChatMessageInput
    ): Promise<ChatMessage> => {
      return apiClient.post<ChatMessage>(
        `/api/teams/${teamId}/messages`,
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['messages', teamId, date],
      });
    },
  });
}
