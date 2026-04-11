'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useMyTasks } from '@/hooks/query/useMyTasks';
import { useUpdateJoinRequestFromTasks } from '@/hooks/query/useUpdateJoinRequestFromTasks';
import { useAuthStore } from '@/store/authStore';
import { JoinRequestActions } from '@/components/team/JoinRequestActions';
import { Button } from '@/components/common/Button';

export default function MyTasksPage() {
  const router = useRouter();
  const { data, isLoading, isError } = useMyTasks();
  const updateJoinRequest = useUpdateJoinRequestFromTasks();
  const currentUser = useAuthStore((state) => state.currentUser);
  const logout = useAuthStore((state) => state.logout);

  const handleNavigateHome = () => {
    router.push('/');
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleApprove = (requestId: string) => {
    const task = data?.tasks?.find((t) => t.id === requestId);
    if (task) {
      updateJoinRequest.mutate({
        teamId: task.teamId,
        requestId,
        action: 'APPROVE',
      });
    }
  };

  const handleReject = (requestId: string) => {
    const task = data?.tasks?.find((t) => t.id === requestId);
    if (task) {
      updateJoinRequest.mutate({
        teamId: task.teamId,
        requestId,
        action: 'REJECT',
      });
    }
  };

  const tasks = data?.tasks || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="flex items-center h-14 px-4 bg-white border-b border-gray-200 sticky top-0 z-30">
        <button
          type="button"
          onClick={handleNavigateHome}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors duration-150 mr-2"
          aria-label="홈"
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-gray-900">나의 할 일</h1>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <span className="text-sm font-normal text-gray-600">{currentUser?.name || '사용자'}</span>
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
        {/* Section Title */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            가입 신청 목록
          </h2>
          {tasks.length > 0 && (
            <span className="text-sm font-medium text-gray-500">
              ({tasks.length}건)
            </span>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="animate-pulse">
              <p className="text-sm text-gray-500">로딩 중...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <svg className="w-12 h-12 text-error-500 mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm text-error-500">가입 신청 목록을 불러오는 중 오류가 발생했습니다.</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <p className="text-lg font-semibold text-gray-600 mb-2">
              현재 처리 대기 중인
            </p>
            <p className="text-lg font-semibold text-gray-600 mb-2">
              가입 신청이 없습니다.
            </p>
          </div>
        )}

        {/* Tasks List */}
        {!isLoading && !isError && tasks.length > 0 && (
          <div className="flex flex-col gap-4">
            {tasks.map((task) => (
              <JoinRequestActions
                key={task.id}
                request={{
                  id: task.id,
                  teamId: task.teamId,
                  teamName: task.teamName,
                  requesterId: task.requesterId,
                  requesterName: task.requesterName,
                  requesterEmail: task.requesterEmail,
                  status: task.status,
                  requestedAt: task.requestedAt,
                  respondedAt: task.respondedAt,
                }}
                onApprove={handleApprove}
                onReject={handleReject}
                isPending={updateJoinRequest.isPending}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
