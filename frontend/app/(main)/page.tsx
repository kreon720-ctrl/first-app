'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useMyTeams } from '@/hooks/query/useTeams';
import { useAuthStore } from '@/store/authStore';
import { TeamList } from '@/components/team/TeamList';
import { Button } from '@/components/common/Button';

export default function HomePage() {
  const router = useRouter();
  const { data, isLoading, isError } = useMyTeams();
  const currentUser = useAuthStore((state) => state.currentUser);
  const logout = useAuthStore((state) => state.logout);

  const handleTeamClick = (teamId: string) => {
    router.push(`/teams/${teamId}`);
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const teams = data?.teams || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="flex items-center justify-between h-14 px-4 bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-gray-900 truncate">Team CalTalk</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-normal text-gray-600">{currentUser?.name}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleLogout}
          >
            로그아웃
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">내 팀 목록</h2>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => router.push('/teams/explore')}
          >
            팀 탐색
          </Button>
        </div>

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
          <TeamList
            teams={teams}
            onTeamClick={handleTeamClick}
            emptyMessage="아직 팀이 없습니다."
          />
        )}

        {/* FAB for team creation */}
        {!isLoading && teams.length === 0 && (
          <div className="flex flex-col items-center mt-6">
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={() => router.push('/teams/new')}
            >
              + 팀 생성
            </Button>
          </div>
        )}
      </main>

      {/* Floating Action Button (when teams exist) */}
      {!isLoading && teams.length > 0 && (
        <button
          type="button"
          onClick={() => router.push('/teams/new')}
          className="fixed bottom-6 right-4 z-10 inline-flex items-center justify-center gap-2 rounded-full py-3 px-5 text-base font-semibold bg-primary-500 text-white shadow-lg hover:bg-primary-600 active:bg-primary-700 transition-colors duration-150"
          aria-label="팀 생성"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}
    </div>
  );
}
