// API Client - fetch wrapper with automatic Authorization header injection and 401 retry logic

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface FetchOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
  skipAuth?: boolean;
  skipRetry?: boolean;
}

class ApiClient {
  private baseUrl: string;
  private isRefreshing = false;
  private refreshPromise: Promise<string | null> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Get access token from localStorage
   */
  private getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  }

  /**
   * Get refresh token from localStorage
   */
  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refreshToken');
  }

  /**
   * Set tokens to localStorage
   */
  setTokens(accessToken: string, refreshToken: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  /**
   * Clear tokens from localStorage and auth cookie
   */
  clearTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    document.cookie = 'auth-initialized=; path=/; max-age=0';
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshToken(): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) {
          return null;
        }

        const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
          return null;
        }

        const data = await response.json();
        const newAccessToken = data.accessToken;

        // Update access token in localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', newAccessToken);
        }

        return newAccessToken;
      } catch (error) {
        console.error('Token refresh failed:', error);
        return null;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
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
      const accessToken = this.getAccessToken();
      if (accessToken) {
        hadAccessToken = true;
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
    }

    // First attempt
    let response = await fetch(`${this.baseUrl}${url}`, {
      ...restOptions,
      headers,
    });

    // If 401 and we had a token, attempt token refresh and retry
    // If we didn't have a token, pass the 401 through (e.g. login with wrong credentials)
    if (response.status === 401 && hadAccessToken && !skipRetry) {
      const newAccessToken = await this.refreshToken();

      if (newAccessToken) {
        // Retry with new token
        headers['Authorization'] = `Bearer ${newAccessToken}`;
        response = await fetch(`${this.baseUrl}${url}`, {
          ...restOptions,
          headers,
        });
      } else {
        // Token refresh failed - clear tokens and redirect to login
        this.clearTokens();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw new Error('Authentication required');
      }
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
