// Main Layout - protected routes layout with auth guard

'use client';

import { useEffect } from 'react';
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

  useEffect(() => {
    // Check if user is authenticated
    // Since middleware can't access localStorage, we do client-side check
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    if (!accessToken && !isAuthenticated) {
      // Not authenticated, redirect to login
      router.replace('/login');
    }
  }, [isAuthenticated, router, pathname]);

  // Check synchronously if we have a token
  const hasToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  // If not authenticated and no token, show nothing (redirecting)
  if (!hasToken && !isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}
