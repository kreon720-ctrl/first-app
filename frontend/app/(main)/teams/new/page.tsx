'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { TeamCreateForm } from '@/components/team/TeamCreateForm';

export default function TeamCreatePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="flex items-center h-14 px-4 bg-white border-b border-gray-200">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors duration-150"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          뒤로
        </button>
        <h1 className="flex-1 text-lg font-semibold text-gray-900 text-center pr-16">팀 생성</h1>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-8">
        <TeamCreateForm />
      </main>
    </div>
  );
}
