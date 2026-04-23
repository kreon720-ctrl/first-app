// Main Layout - protected routes layout with auth guard

'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/apiClient';
import type { User } from '@/types/auth';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const currentUser = useAuthStore((state) => state.currentUser);
  const setUser = useAuthStore((state) => state.setUser);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

    const accessToken = localStorage.getItem('accessToken');

    if (!accessToken && !isAuthenticated) {
      document.cookie = 'auth-initialized=; path=/; max-age=0';
      router.replace('/login');
      return;
    }

    // 토큰은 있지만 currentUser가 없으면 서버에서 복원
    if (accessToken && !currentUser) {
      apiClient.get<User>('/api/auth/me')
        .then((user) => {
          const refreshToken = localStorage.getItem('refreshToken') ?? '';
          setUser(user, accessToken, refreshToken);
        })
        .catch(() => {
          // 사용자를 찾을 수 없거나 토큰 만료 → 로그아웃 후 로그인 페이지로
          apiClient.clearTokens();
          document.cookie = 'auth-initialized=; path=/; max-age=0';
          router.replace('/login');
        });
    }
  }, [isAuthenticated, currentUser, router, pathname, setUser]);

  // Show loading spinner until client is mounted
  if (!isClient) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-dark-base">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  const hasToken = localStorage.getItem('accessToken');

  if (!hasToken && !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-dark-base">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-base">
      {children}
    </div>
  );
}
