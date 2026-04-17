import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/types/auth';

export function useUpdateProfile() {
  const setUser = useAuthStore(s => s.setUser);
  const currentUser = useAuthStore(s => s.currentUser);

  return useMutation({
    mutationFn: async (name: string): Promise<User> => {
      return apiClient.patch<User>('/api/me', { name });
    },
    onSuccess: (updated) => {
      // authStore의 currentUser 이름 갱신 (토큰 유지)
      const accessToken = localStorage.getItem('accessToken') ?? '';
      const refreshToken = localStorage.getItem('refreshToken') ?? '';
      setUser(updated, accessToken, refreshToken);
    },
  });
}
