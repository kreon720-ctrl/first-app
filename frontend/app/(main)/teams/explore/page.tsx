'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { usePublicTeams } from '@/hooks/query/useTeams';
import { TeamExploreList } from '@/components/team/TeamExploreList';

export default function TeamExplorePage() {
  const router = useRouter();
  const { data, isLoading, isError } = usePublicTeams();

  const handleSuccess = (teamId: string) => {
    console.log('Join request successful for team:', teamId);
  };

  const teams = data?.teams || [];

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
        <h1 className="flex-1 text-lg font-semibold text-gray-900 text-center pr-16">팀 탐색</h1>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        <p className="text-base font-normal text-gray-600 mb-4">
          원하는 팀을 찾아 가입하세요.
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-pulse">
              <p className="text-sm text-gray-500">로딩 중...</p>
            </div>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <svg className="w-12 h-12 text-error-500 mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm text-error-500">팀 목록을 불러오는 중 오류가 발생했습니다.</p>
          </div>
        ) : (
          <TeamExploreList teams={teams} onSuccess={handleSuccess} />
        )}
      </main>
    </div>
  );
}
