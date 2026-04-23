'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMyTeams, useUpdateTeam, useDeleteTeam } from '@/hooks/query/useTeams';
import { useMyTasks } from '@/hooks/query/useMyTasks';
import { useAuthStore } from '@/store/authStore';
import { TeamList } from '@/components/team/TeamList';
import { Button } from '@/components/common/Button';
import { AIAssistantButton } from '@/components/common/AIAssistantButton';
import { ThemeToggle } from '@/components/common/ThemeToggle';

export default function HomePage() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useMyTeams();
  const { data: tasksData } = useMyTasks();
  const updateTeam = useUpdateTeam();
  const deleteTeam = useDeleteTeam();
  const currentUser = useAuthStore((state) => state.currentUser);
  const logout = useAuthStore((state) => state.logout);

  const [toast, setToast] = useState<string | null>(null);

  // 팀별 승인 대기 건수 계산
  const pendingCountByTeam: Record<string, number> = {};
  (tasksData?.tasks ?? []).forEach((task) => {
    if (task.status === 'PENDING') {
      pendingCountByTeam[task.teamId] = (pendingCountByTeam[task.teamId] ?? 0) + 1;
    }
  });

  const handleTeamClick = (teamId: string) => {
    router.push(`/teams/${teamId}`);
  };

  const handleUpdateTeam = async (teamId: string, data: { name: string; description: string }) => {
    try {
      await updateTeam.mutateAsync({ teamId, data });
      setToast('팀이 수정되었습니다.');
      refetch();
      setTimeout(() => setToast(null), 2000);
    } catch {
      setToast('팀 수정에 실패했습니다.');
      setTimeout(() => setToast(null), 2000);
    }
  };

  const handleApproveTeam = (teamId: string) => {
    router.push(`/me/tasks?teamId=${teamId}`);
  };

  const handleDeleteTeam = async (teamId: string) => {
    try {
      await deleteTeam.mutateAsync(teamId);
      setToast('팀이 삭제되었습니다.');
      refetch();
      setTimeout(() => setToast(null), 2000);
    } catch {
      setToast('팀 삭제에 실패했습니다.');
      setTimeout(() => setToast(null), 2000);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const teams = data?.teams || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-base">
      {/* Header */}
      <header className="flex items-center justify-between h-14 px-4 bg-white border-b border-gray-200 sticky top-0 z-30 dark:bg-dark-surface dark:border-dark-border">
        <div className="flex items-center gap-2">
          <svg className="w-6 h-6 text-gray-500 dark:text-[#FFB800] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="2.2" />
            <circle cx="12" cy="3.5" r="1.3" />
            <line x1="12" y1="4.8" x2="12" y2="9.8" />
            <circle cx="19.5" cy="6.5" r="1.3" />
            <line x1="18.5" y1="7.5" x2="13.8" y2="10.8" />
            <circle cx="19.5" cy="17.5" r="1.3" />
            <line x1="18.5" y1="16.5" x2="13.8" y2="13.2" />
            <circle cx="12" cy="20.5" r="1.3" />
            <line x1="12" y1="19.2" x2="12" y2="14.2" />
            <circle cx="4.5" cy="17.5" r="1.3" />
            <line x1="5.5" y1="16.5" x2="10.2" y2="13.2" />
            <circle cx="4.5" cy="6.5" r="1.3" />
            <line x1="5.5" y1="7.5" x2="10.2" y2="10.8" />
          </svg>
          <h1 className="text-lg font-semibold text-gray-900 truncate dark:text-dark-text">TEAM WORKS</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <img src="/user.png" alt="user" className="w-5 h-5 opacity-50 dark:invert dark:opacity-75" />
            <span className="text-sm font-normal text-gray-600 dark:text-dark-text-muted">{currentUser?.name}</span>
          </div>
          <AIAssistantButton />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleLogout}
          >
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              로그아웃
            </span>
          </Button>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 dark:text-dark-text">내 팀 목록</h2>

        {/* Toast 메시지 */}
        {toast && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-fade-in">
            {toast}
          </div>
        )}

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
            <p className="text-sm text-error-500 mb-4">팀 목록을 불러오는 중 오류가 발생했습니다.</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => refetch()}
            >
              다시 시도
            </Button>
          </div>
        ) : (
          <TeamList
            teams={teams}
            pendingCountByTeam={pendingCountByTeam}
            onTeamClick={handleTeamClick}
            onApproveTeam={handleApproveTeam}
            onUpdateTeam={handleUpdateTeam}
            onDeleteTeam={handleDeleteTeam}
            emptyMessage="아직 팀이 없습니다."
          />
        )}

        {/* Bottom action buttons */}
        <div className="flex justify-center gap-3 mt-8">
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => router.push('/teams/new')}
            className="w-32"
          >
            + 팀 생성
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => router.push('/teams/explore')}
            className="w-32"
          >
            팀 검색
          </Button>
        </div>

      </main>

    </div>
  );
}
