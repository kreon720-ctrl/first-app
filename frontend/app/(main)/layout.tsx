// Main Layout - protected routes layout with auth guard

'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Check if user is authenticated
    const accessToken = localStorage.getItem('accessToken');

    if (!accessToken && !isAuthenticated) {
      // Clear stale auth cookie before redirecting so proxy won't loop back
      document.cookie = 'auth-initialized=; path=/; max-age=0';
      router.replace('/login');
    }
  }, [isAuthenticated, router, pathname]);

  // Show loading spinner until client is mounted
  if (!isClient) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  // Check synchronously if we have a token
  const hasToken = localStorage.getItem('accessToken');

  // If not authenticated and no token, show loading spinner while redirecting
  if (!hasToken && !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}
