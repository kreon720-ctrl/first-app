import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuthStore } from '@/store/authStore';
import type { SignupInput, LoginInput, AuthResponse } from '@/types/auth';

export function useSignup() {
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: async (data: SignupInput): Promise<AuthResponse> => {
      return apiClient.post<AuthResponse>('/api/auth/signup', data);
    },
    onSuccess: (data) => {
      setUser(data.user, data.accessToken);
    },
  });
}

export function useLogin() {
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: async (data: LoginInput): Promise<AuthResponse> => {
      return apiClient.post<AuthResponse>('/api/auth/login', data);
    },
    onSuccess: (data) => {
      setUser(data.user, data.accessToken);
    },
  });
}
