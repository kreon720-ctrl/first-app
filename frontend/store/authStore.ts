// Auth Store - manages authentication state

import { create } from 'zustand';
import { User } from '@/types/auth';
import { apiClient } from '@/lib/apiClient';

export interface AuthState {
  currentUser: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;

  // Actions
  setUser: (user: User, accessToken: string) => void;
  logout: () => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  accessToken: null,
  isAuthenticated: false,

  setUser: (user: User, accessToken: string) => {
    set({
      currentUser: user,
      accessToken,
      isAuthenticated: true,
    });
  },

  logout: () => {
    apiClient.clearTokens();
    set({
      currentUser: null,
      accessToken: null,
      isAuthenticated: false,
    });
  },

  clearUser: () => {
    set({
      currentUser: null,
      accessToken: null,
      isAuthenticated: false,
    });
  },
}));
