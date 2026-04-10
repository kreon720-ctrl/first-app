import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient, ApiError } from '../apiClient';

describe('apiClient', () => {
  const originalFetch = global.fetch;
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    });
  });

  describe('Token Management', () => {
    it('sets tokens to localStorage', () => {
      apiClient.setTokens('access-123', 'refresh-456');

      expect(localStorage.getItem('accessToken')).toBe('access-123');
      expect(localStorage.getItem('refreshToken')).toBe('refresh-456');
    });

    it('clears tokens from localStorage', () => {
      localStorage.setItem('accessToken', 'access-123');
      localStorage.setItem('refreshToken', 'refresh-456');

      apiClient.clearTokens();

      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });
  });

  describe('Authorization Header', () => {
    it('adds Authorization header when access token exists', async () => {
      localStorage.setItem('accessToken', 'test-token');

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ data: 'ok' }),
      });

      await apiClient.get('/api/test');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('does not add Authorization header when skipAuth is true', async () => {
      localStorage.setItem('accessToken', 'test-token');

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ data: 'ok' }),
      });

      await apiClient.get('/api/test', { skipAuth: true });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            Authorization: expect.any(String),
          }),
        })
      );
    });
  });

  describe('401 Retry Logic', () => {
    it('retries request with new token after 401', async () => {
      localStorage.setItem('accessToken', 'old-token');
      localStorage.setItem('refreshToken', 'valid-refresh-token');

      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(async (url, options) => {
        callCount++;

        // First call: 401
        if (callCount === 1) {
          return {
            status: 401,
            ok: false,
            headers: { get: () => 'application/json' },
            json: () => Promise.resolve({ error: 'Unauthorized' }),
          };
        }

        // Second call (refresh): success
        if (url.toString().includes('/api/auth/refresh')) {
          return {
            ok: true,
            headers: { get: () => 'application/json' },
            json: () => Promise.resolve({ accessToken: 'new-token' }),
          };
        }

        // Third call (retry): success
        return {
          ok: true,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({ data: 'success' }),
        };
      });

      const result = await apiClient.get('/api/test');

      expect(result).toEqual({ data: 'success' });
      expect(callCount).toBe(3); // initial, refresh, retry
    });

    it('redirects to login when refresh token fails', async () => {
      localStorage.setItem('accessToken', 'old-token');
      localStorage.setItem('refreshToken', 'expired-refresh-token');

      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(async (url, options) => {
        callCount++;

        // First call: 401
        if (callCount === 1) {
          return {
            status: 401,
            ok: false,
            headers: { get: () => 'application/json' },
            json: () => Promise.resolve({ error: 'Unauthorized' }),
          };
        }

        // Second call (refresh): fail
        if (url.toString().includes('/api/auth/refresh')) {
          return {
            ok: false,
            status: 401,
            headers: { get: () => 'application/json' },
            json: () => Promise.resolve({ error: 'Invalid refresh token' }),
          };
        }

        return {
          ok: true,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({ data: 'should not reach' }),
        };
      });

      await expect(apiClient.get('/api/test')).rejects.toThrow('Authentication required');

      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(window.location.href).toBe('/login');
    });
  });

  describe('Error Handling', () => {
    it('throws ApiError with status code on non-ok response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ error: 'Not found' }),
      });

      await expect(apiClient.get('/api/not-found')).rejects.toThrow(ApiError);

      try {
        await apiClient.get('/api/not-found');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(404);
      }
    });

    it('includes error message from response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ error: '잘못된 요청입니다.' }),
      });

      try {
        await apiClient.get('/api/test');
      } catch (error) {
        expect((error as Error).message).toBe('잘못된 요청입니다.');
      }
    });
  });

  describe('Convenience Methods', () => {
    it('get uses GET method', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({}),
      });

      await apiClient.get('/api/test');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('post uses POST method with JSON body', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({}),
      });

      await apiClient.post('/api/test', { name: 'test' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'test' }),
        })
      );
    });

    it('patch uses PATCH method with JSON body', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({}),
      });

      await apiClient.patch('/api/test/1', { name: 'updated' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ name: 'updated' }),
        })
      );
    });

    it('delete uses DELETE method', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({}),
      });

      await apiClient.delete('/api/test/1');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });
});
