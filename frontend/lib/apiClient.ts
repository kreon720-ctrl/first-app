// API Client - HTTP 메서드 (get/post/patch/put/delete)만 담당
// 토큰 관리: tokenManager.ts
// 401 재시도 로직: authInterceptor.ts

import { tokenManager } from './tokenManager';
import { handleUnauthorized } from './authInterceptor';

// 기본값은 빈 문자열(same-origin) — Docker(nginx) 환경에서는 /api/* 가 nginx 를 통해
// backend 로 프록시되므로 CORS 가 발생하지 않음. 별도 도메인으로 띄울 때만 env 명시.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

interface FetchOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
  skipAuth?: boolean;
  skipRetry?: boolean;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Delegate token management to tokenManager
   */
  setTokens(accessToken: string, refreshToken: string): void {
    tokenManager.setTokens(accessToken, refreshToken);
  }

  clearTokens(): void {
    tokenManager.clearTokens();
  }

  /**
   * Main fetch method with automatic Authorization header and 401 retry
   */
  async fetch<T = unknown>(url: string, options: FetchOptions = {}): Promise<T> {
    const {
      skipAuth = false,
      skipRetry = false,
      headers: customHeaders = {},
      ...restOptions
    } = options;

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    // Track whether we had an access token (for 401 retry decision)
    let hadAccessToken = false;

    // Add Authorization header if not skipped
    if (!skipAuth) {
      const accessToken = tokenManager.getAccessToken();
      if (accessToken) {
        hadAccessToken = true;
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
    }

    const fullUrl = `${this.baseUrl}${url}`;

    // First attempt
    let response = await fetch(fullUrl, { ...restOptions, headers });

    // If 401 and we had a token, delegate retry to authInterceptor
    // If we didn't have a token, pass the 401 through (e.g. login with wrong credentials)
    if (response.status === 401 && hadAccessToken && !skipRetry) {
      response = await handleUnauthorized((authHeader) => {
        const retryHeaders = { ...headers, Authorization: authHeader };
        return fetch(fullUrl, { ...restOptions, headers: retryHeaders });
      });
    }

    // Parse response
    let data: unknown;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // If response is not ok, throw error with data
    if (!response.ok) {
      const errorData = data as { error?: string } | null;
      const errorMessage = errorData?.error || `HTTP error! status: ${response.status}`;
      throw new ApiError(response.status, errorMessage);
    }

    return data as T;
  }

  /**
   * Convenience methods
   */
  async get<T>(url: string, options?: FetchOptions): Promise<T> {
    return this.fetch<T>(url, { method: 'GET', ...options });
  }

  async post<T>(url: string, body?: unknown, options?: FetchOptions): Promise<T> {
    return this.fetch<T>(url, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
  }

  async patch<T>(url: string, body?: unknown, options?: FetchOptions): Promise<T> {
    return this.fetch<T>(url, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
  }

  async put<T>(url: string, body?: unknown, options?: FetchOptions): Promise<T> {
    return this.fetch<T>(url, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
  }

  async delete<T>(url: string, options?: FetchOptions): Promise<T> {
    return this.fetch<T>(url, { method: 'DELETE', ...options });
  }
}

/**
 * Custom API Error class with status code
 */
export class ApiError extends Error {
  public status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

// Create singleton instance
export const apiClient = new ApiClient(API_BASE_URL);

export default apiClient;
