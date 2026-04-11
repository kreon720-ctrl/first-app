import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/server
const mockRedirect = vi.fn();
const mockNext = vi.fn();

vi.mock('next/server', () => ({
  NextResponse: {
    redirect: (url: URL) => {
      mockRedirect(url.pathname);
      return { type: 'redirect', url };
    },
    next: () => {
      mockNext();
      return { type: 'next' };
    },
  },
}));

// Import after mocking
const { proxy, config } = await import('../proxy');

function makeRequest(pathname: string, cookies: Record<string, string> = {}) {
  return {
    nextUrl: new URL(`http://localhost${pathname}`),
    cookies: {
      has: (name: string) => name in cookies,
      get: (name: string) => cookies[name] ? { value: cookies[name] } : undefined,
    },
    url: `http://localhost${pathname}`,
  } as unknown as import('next/server').NextRequest;
}

describe('proxy (Next.js route guard)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Unauthenticated user (no auth-initialized cookie)', () => {
    it('allows access to /login', () => {
      const req = makeRequest('/login');
      proxy(req);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it('allows access to /signup', () => {
      const req = makeRequest('/signup');
      proxy(req);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it('allows access to /teams/:teamId (client-side guard handles auth)', () => {
      const req = makeRequest('/teams/team-123');
      proxy(req);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it('allows access to /me/tasks', () => {
      const req = makeRequest('/me/tasks');
      proxy(req);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRedirect).not.toHaveBeenCalled();
    });
  });

  describe('Authenticated user (has auth-initialized cookie)', () => {
    const cookies = { 'auth-initialized': 'true' };

    it('redirects /login to /', () => {
      const req = makeRequest('/login', cookies);
      proxy(req);
      expect(mockRedirect).toHaveBeenCalledWith('/');
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('redirects /signup to /', () => {
      const req = makeRequest('/signup', cookies);
      proxy(req);
      expect(mockRedirect).toHaveBeenCalledWith('/');
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('allows access to /teams/:teamId', () => {
      const req = makeRequest('/teams/team-123', cookies);
      proxy(req);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it('allows access to /me/tasks', () => {
      const req = makeRequest('/me/tasks', cookies);
      proxy(req);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRedirect).not.toHaveBeenCalled();
    });
  });

  describe('config.matcher', () => {
    it('includes /login', () => {
      expect(config.matcher).toContain('/login');
    });

    it('includes /signup', () => {
      expect(config.matcher).toContain('/signup');
    });

    it('includes /teams/:path* pattern', () => {
      const hasTeamsPattern = config.matcher.some((m: string) =>
        m.includes('/teams')
      );
      expect(hasTeamsPattern).toBe(true);
    });

    it('includes /me/:path* pattern', () => {
      const hasMePattern = config.matcher.some((m: string) =>
        m.includes('/me')
      );
      expect(hasMePattern).toBe(true);
    });
  });
});
