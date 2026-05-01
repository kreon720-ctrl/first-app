// Auth Interceptor - 401 감지 + Access Token 자동 갱신 + 재시도 로직

import { tokenManager } from './tokenManager';

// 기본값은 빈 문자열(same-origin) — Docker(nginx) 환경에서는 /api/* 가 nginx 를 통해
// backend 로 프록시되므로 CORS 가 발생하지 않음. 별도 도메인으로 띄울 때만 env 명시.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

/**
 * Refresh access token using the stored refresh token.
 * Returns the new access token, or null if refresh fails.
 */
async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const refreshToken = tokenManager.getRefreshToken();
      if (!refreshToken) return null;

      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      const newAccessToken = data.accessToken;
      tokenManager.setAccessToken(newAccessToken);
      return newAccessToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Attempt token refresh and retry the original fetch call.
 * If refresh fails, clears tokens and redirects to /login.
 */
export async function handleUnauthorized(
  retryFetch: (authHeader: string) => Promise<Response>
): Promise<Response> {
  const newAccessToken = await refreshAccessToken();

  if (newAccessToken) {
    return retryFetch(`Bearer ${newAccessToken}`);
  }

  tokenManager.clearTokens();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
  throw new Error('Authentication required');
}

export { isRefreshing };
