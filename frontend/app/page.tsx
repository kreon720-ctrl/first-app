// Root Page - redirects to login or home based on auth status

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function RootPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    // Check authentication
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    if (accessToken || isAuthenticated) {
      // Authenticated - go to home (team list)
      router.push('/');
    } else {
      // Not authenticated - redirect to login
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="animate-pulse">
          <h1 className="text-2xl font-bold text-gray-900">Team CalTalk</h1>
          <p className="text-sm text-gray-500 mt-2">로딩 중...</p>
        </div>
      </div>
    </div>
  );
}
