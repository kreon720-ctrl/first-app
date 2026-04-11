'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMyTeams, useUpdateTeam, useDeleteTeam } from '@/hooks/query/useTeams';
import { useAuthStore } from '@/store/authStore';
import { TeamList } from '@/components/team/TeamList';
import { Button } from '@/components/common/Button';

export default function HomePage() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useMyTeams();
  const updateTeam = useUpdateTeam();
  const deleteTeam = useDeleteTeam();
  const currentUser = useAuthStore((state) => state.currentUser);
  const logout = useAuthStore((state) => state.logout);

  const [toast, setToast] = useState<string | null>(null);

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
        <h2 className="text-xl font-semibold text-gray-900 mb-4">내 팀 목록</h2>

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
            onTeamClick={handleTeamClick}
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
