import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/apiClient';

// Mock apiClient
vi.mock('@/lib/apiClient', () => ({
  apiClient: {
    clearTokens: vi.fn(),
  },
}));

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset store before each test
    useAuthStore.setState({
      currentUser: null,
      accessToken: null,
      isAuthenticated: false,
    });
    vi.clearAllMocks();
  });

  it('should have initial state', () => {
    const state = useAuthStore.getState();
    expect(state.currentUser).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  describe('setUser', () => {
    it('should set user and access token', () => {
      const user = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
      };
      const accessToken = 'test-access-token';

      useAuthStore.getState().setUser(user, accessToken, 'test-refresh-token');

      const state = useAuthStore.getState();
      expect(state.currentUser).toEqual(user);
      expect(state.accessToken).toBe(accessToken);
      expect(state.isAuthenticated).toBe(true);
    });
  });

  describe('logout', () => {
    it('should clear tokens and reset state', () => {
      // First set a user
      const user = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
      };
      useAuthStore.getState().setUser(user, 'test-token', 'test-refresh-token');

      // Then logout
      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.currentUser).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(apiClient.clearTokens).toHaveBeenCalled();
    });
  });

  describe('clearUser', () => {
    it('should reset state without clearing tokens', () => {
      // First set a user
      const user = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
      };
      useAuthStore.getState().setUser(user, 'test-token', 'test-refresh-token');

      // Then clear user
      useAuthStore.getState().clearUser();

      const state = useAuthStore.getState();
      expect(state.currentUser).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(apiClient.clearTokens).not.toHaveBeenCalled();
    });
  });
});
