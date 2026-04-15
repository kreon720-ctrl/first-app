'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTeamStore } from '@/store/teamStore';
import { useAuthStore } from '@/store/authStore';
import { useTeamDetail } from '@/hooks/query/useTeams';
import { useSchedules, useCreateSchedule, useUpdateSchedule, useDeleteSchedule } from '@/hooks/query/useSchedules';
import { usePostits, useCreatePostit, useUpdatePostitContent, useDeletePostit } from '@/hooks/query/usePostits';
import { useMyTasks } from '@/hooks/query/useMyTasks';
import { CalendarView } from '@/components/schedule/CalendarView';
import { ScheduleForm } from '@/components/schedule/ScheduleForm';
import { ScheduleDetailModal } from '@/components/schedule/ScheduleDetailModal';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { Button } from '@/components/common/Button';
import type { Schedule, ScheduleCreateInput, ScheduleUpdateInput, ScheduleColor } from '@/types/schedule';

interface TeamMainPageProps {
  params: Promise<{ teamId: string }>;
}

function getKSTTimeStrings(dateStr: string): { startAt: string; endAt: string } {
  const now = new Date();
  const kstHour = new Date(now.getTime() + 9 * 60 * 60 * 1000).getUTCHours();
  const endHour = (kstHour + 1) % 24;
  const endDate = endHour === 0 ? (() => {
    const d = new Date(dateStr);
    d.setUTCDate(d.getUTCDate() + 1);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  })() : dateStr;
  return {
    startAt: `${dateStr}T${String(kstHour).padStart(2, '0')}:00`,
    endAt: `${endDate}T${String(endHour).padStart(2, '0')}:00`,
  };
}

export default function TeamMainPage({ params }: TeamMainPageProps) {
  const { teamId } = use(params);
  const router = useRouter();
  const { isDesktop } = useBreakpoint();
  const { data: team, isLoading, isError } = useTeamDetail(teamId);
  const currentUser = useAuthStore((state) => state.currentUser);
  const logout = useAuthStore((state) => state.logout);
  
  const {
    selectedDate,
    calendarView,
    setSelectedTeamId,
    setSelectedDate,
    setCalendarView,
  } = useTeamStore();

  const [activeTab, setActiveTab] = useState<'calendar' | 'chat'>('calendar');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [scheduleDefaultDate, setScheduleDefaultDate] = useState<string>('');
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [selectedPostitColor, setSelectedPostitColor] = useState<ScheduleColor | null>(null);
  const [postitError, setPostitError] = useState<string | null>(null);

  const { data: schedulesData } = useSchedules(teamId, {
    view: calendarView,
    date: selectedDate,
  });
  // 포스트잇: 현재 월 (YYYY-MM) 기준 조회 — PC + 월간뷰 전용
  const postitMonth = selectedDate.slice(0, 7);
  const { data: postitsData } = usePostits(
    teamId,
    isDesktop && calendarView === 'month' ? postitMonth : ''
  );
  const { data: myTasksData } = useMyTasks();
  const pendingCount = myTasksData?.totalPendingCount ?? 0;
  const createSchedule = useCreateSchedule(teamId);
  const updateSchedule = useUpdateSchedule(teamId, selectedSchedule?.id ?? '');
  const deleteSchedule = useDeleteSchedule(teamId);
  const createPostit = useCreatePostit(teamId);
  const updatePostitContent = useUpdatePostitContent(teamId);
  const deletePostitMutation = useDeletePostit(teamId);
  const schedules = schedulesData?.schedules ?? [];
  const postits = postitsData?.postits ?? [];

  // Update selected team ID when component mounts
  useEffect(() => {
    setSelectedTeamId(teamId);
  }, [teamId, setSelectedTeamId]);

  const handleCreateSchedule = (defaultDate?: string) => {
    setScheduleDefaultDate(defaultDate || selectedDate);
    setShowCreateModal(true);
  };

  const handleScheduleClick = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setShowDetailModal(true);
  };

  const handleCreateSubmit = async (data: ScheduleCreateInput | ScheduleUpdateInput) => {
    try {
      await createSchedule.mutateAsync(data as ScheduleCreateInput);
      setShowCreateModal(false);
    } catch { /* ScheduleForm에서 error prop으로 표시 */ }
  };

  const handleEditSubmit = async (data: ScheduleCreateInput | ScheduleUpdateInput) => {
    try {
      await updateSchedule.mutateAsync(data as ScheduleUpdateInput);
      setShowEditModal(false);
      setSelectedSchedule(null);
    } catch { /* ScheduleForm에서 error prop으로 표시 */ }
  };

  const handleDelete = async () => {
    if (!selectedSchedule) return;
    try {
      await deleteSchedule.mutateAsync(selectedSchedule.id);
      setShowDetailModal(false);
      setSelectedSchedule(null);
    } catch { /* 삭제 실패 */ }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleDateClick = (date: Date) => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    // PC 월간뷰 + 포스트잇 색상 선택 중이면 포스트잇 생성
    if (isDesktop && calendarView === 'month' && selectedPostitColor) {
      const colorToCreate = selectedPostitColor;
      setSelectedPostitColor(null);
      createPostit.mutate(
        { date: dateString, color: colorToCreate },
        {
          onError: (err) => {
            const msg = err instanceof Error ? err.message : '포스트잇 생성에 실패했습니다.';
            setPostitError(msg);
            setTimeout(() => setPostitError(null), 4000);
          },
        }
      );
      return;
    }

    setSelectedDate(dateString);
  };

  const handlePostitDelete = (id: string, date: string) => {
    deletePostitMutation.mutate({ postitId: id, date });
  };

  const handlePostitContentChange = (id: string, content: string) => {
    updatePostitContent.mutate({ postitId: id, content });
  };

  const handleViewChange = (view: 'month' | 'week' | 'day') => {
    setCalendarView(view);
  };

  const handleNavigateHome = () => {
    router.push('/');
  };

  const handleNavigateToTasks = () => {
    router.push('/me/tasks');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse">
          <p className="text-sm text-gray-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (isError || !team) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center py-16 px-6 text-center">
          <svg className="w-12 h-12 text-error-500 mb-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-sm text-error-500 mb-4">팀 정보를 불러오는 중 오류가 발생했습니다.</p>
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleNavigateHome}
          >
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  const isLeader = team.myRole === 'LEADER';

  const currentDate = new Date(selectedDate);

  // Desktop layout: side-by-side split
  if (isDesktop) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col bg-white">
        {/* Header */}
        <header className="flex items-center justify-between h-16 px-6 bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleNavigateHome}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors duration-150"
              aria-label="홈"
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-900 truncate">{team.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            {isLeader && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleNavigateToTasks}
                className="relative"
              >
                나의 할 일
                {pendingCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                )}
              </Button>
            )}
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

        {/* Main content: split layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Calendar section (left 60%) */}
          <div className="w-[60%] border-r border-gray-200 overflow-y-auto">
            <CalendarView
              currentDate={currentDate}
              view={calendarView}
              schedules={schedules}
              canCreateSchedule={true}
              postits={postits}
              currentUserId={currentUser?.id}
              selectedPostitColor={selectedPostitColor}
              onPostitColorSelect={setSelectedPostitColor}
              onPostitDelete={handlePostitDelete}
              onPostitContentChange={handlePostitContentChange}
              onViewChange={handleViewChange}
              onDateChange={(date) => {
                const year = date.getUTCFullYear();
                const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                const day = String(date.getUTCDate()).padStart(2, '0');
                setSelectedDate(`${year}-${month}-${day}`);
              }}
              onDateClick={handleDateClick}
              onCreateSchedule={handleCreateSchedule}
              onScheduleClick={handleScheduleClick}
            />
          </div>

          {/* Chat section (right 40%) */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h2 className="text-sm font-medium text-gray-700">
                {new Date(selectedDate).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'short',
                })}{' '}
                채팅
              </h2>
            </div>
            <ChatPanel
              teamId={teamId}
              date={selectedDate}
              isLeader={isLeader}
            />
          </div>
        </div>

        {/* 포스트잇 에러 토스트 */}
        {postitError && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">
            {postitError}
          </div>
        )}

        {/* 일정 등록 모달 (데스크탑) */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-8 overflow-y-auto">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-gray-900">일정 등록</h2>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors duration-150"
                  aria-label="닫기"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <ScheduleForm
                mode="create"
                initialData={scheduleDefaultDate ? {
                  id: '', teamId, title: '', description: null,
                  ...getKSTTimeStrings(scheduleDefaultDate),
                  createdBy: '', createdAt: '', updatedAt: '',
                } : undefined}
                onSubmit={handleCreateSubmit}
                onCancel={() => setShowCreateModal(false)}
                isPending={createSchedule.isPending}
                error={createSchedule.error instanceof Error ? createSchedule.error.message : null}
              />
            </div>
          </div>
        )}

        {/* 일정 상세/수정/삭제 모달 (데스크탑) */}
        <ScheduleDetailModal
          isOpen={showDetailModal}
          schedule={selectedSchedule}
          currentUserId={currentUser?.id ?? null}
          onClose={() => { setShowDetailModal(false); setSelectedSchedule(null); }}
          onEdit={() => { setShowDetailModal(false); setShowEditModal(true); }}
          onDelete={handleDelete}
          isDeleting={deleteSchedule.isPending}
        />

        {showEditModal && selectedSchedule && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-8 overflow-y-auto">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-gray-900">일정 수정</h2>
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setSelectedSchedule(null); }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors duration-150"
                  aria-label="닫기"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <ScheduleForm
                mode="edit"
                initialData={selectedSchedule}
                onSubmit={handleEditSubmit}
                onCancel={() => { setShowEditModal(false); setSelectedSchedule(null); }}
                isPending={updateSchedule.isPending}
                error={updateSchedule.error instanceof Error ? updateSchedule.error.message : null}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Mobile layout: tab-based switching
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between h-14 px-4 bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleNavigateHome}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors duration-150"
            aria-label="홈"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900 truncate">{team.name}</h1>
        </div>
        <button
          type="button"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-150"
          aria-label="메뉴"
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </header>

      {/* Tab navigation */}
      <div className="flex border-b border-gray-200 bg-white">
        <button
          type="button"
          onClick={() => setActiveTab('calendar')}
          className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors duration-150 ${
            activeTab === 'calendar'
              ? 'text-primary-600 border-primary-500'
              : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          캘린더
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors duration-150 ${
            activeTab === 'chat'
              ? 'text-primary-600 border-primary-500'
              : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          채팅
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        {/* Calendar tab */}
        <div
          className={`h-full ${
            activeTab === 'calendar' ? 'block' : 'hidden'
          }`}
        >
          <div className="h-full overflow-y-auto bg-white">
            <CalendarView
              currentDate={currentDate}
              view={calendarView}
              schedules={schedules}
              canCreateSchedule={true}
              compact={true}
              onViewChange={handleViewChange}
              onDateChange={(date) => {
                const year = date.getUTCFullYear();
                const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                const day = String(date.getUTCDate()).padStart(2, '0');
                setSelectedDate(`${year}-${month}-${day}`);
              }}
              onDateClick={handleDateClick}
              onCreateSchedule={handleCreateSchedule}
              onScheduleClick={handleScheduleClick}
            />
          </div>
        </div>

        {/* Chat tab */}
        <div
          className={`h-[calc(100vh-8rem)] ${
            activeTab === 'chat' ? 'flex' : 'hidden'
          } flex-col`}
        >
          <ChatPanel
            teamId={teamId}
            date={selectedDate}
            isLeader={isLeader}
          />
        </div>
      </div>

      {/* 일정 등록 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-8 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">일정 등록</h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors duration-150"
                aria-label="닫기"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ScheduleForm
              mode="create"
              initialData={scheduleDefaultDate ? {
                id: '', teamId, title: '', description: null,
                ...getKSTTimeStrings(scheduleDefaultDate),
                createdBy: '', createdAt: '', updatedAt: '',
              } : undefined}
              onSubmit={handleCreateSubmit}
              onCancel={() => setShowCreateModal(false)}
              isPending={createSchedule.isPending}
              error={createSchedule.error instanceof Error ? createSchedule.error.message : null}
            />
          </div>
        </div>
      )}

      {/* 일정 상세/수정/삭제 모달 */}
      <ScheduleDetailModal
        isOpen={showDetailModal}
        schedule={selectedSchedule}
        currentUserId={currentUser?.id ?? null}
        onClose={() => { setShowDetailModal(false); setSelectedSchedule(null); }}
        onEdit={() => { setShowDetailModal(false); setShowEditModal(true); }}
        onDelete={handleDelete}
        isDeleting={deleteSchedule.isPending}
      />

      {showEditModal && selectedSchedule && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-8 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">일정 수정</h2>
              <button
                type="button"
                onClick={() => { setShowEditModal(false); setSelectedSchedule(null); }}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors duration-150"
                aria-label="닫기"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ScheduleForm
              mode="edit"
              initialData={selectedSchedule}
              onSubmit={handleEditSubmit}
              onCancel={() => { setShowEditModal(false); setSelectedSchedule(null); }}
              isPending={updateSchedule.isPending}
              error={updateSchedule.error instanceof Error ? updateSchedule.error.message : null}
            />
          </div>
        </div>
      )}
    </div>
  );
}
