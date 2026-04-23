'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { TeamExplorePanel } from '@/components/team/TeamExplorePanel';

export default function TeamExplorePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white dark:bg-dark-base">
      {/* Header */}
      <header className="flex items-center h-14 px-4 bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm font-medium text-gray-600 dark:text-dark-text-muted hover:text-gray-900 dark:hover:text-dark-text transition-colors duration-150"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          뒤로
        </button>
        <h1 className="flex-1 text-lg font-semibold text-gray-900 dark:text-dark-text text-center pr-16">팀 탐색</h1>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        <TeamExplorePanel />
      </main>
    </div>
  );
}
